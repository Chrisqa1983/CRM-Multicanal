import fs from "fs";
import path from "path";
import { db } from "@/db";
import { knowledgeDocuments, documentChunks } from "@/db/schema/ai";
import { eq, desc, sql } from "drizzle-orm";
import mammoth from "mammoth";

export interface ProcessedDocument {
  id: string;
  filename: string;
  fileSize: number;
  mimeType: string;
  totalChunks: number;
  createdAt: string;
}

export interface ChunkMatch {
  id: string;
  documentId: string;
  filename: string;
  chunkIndex: number;
  content: string;
  similarity: number;
}

/**
 * Extrae texto plano de un búfer según su tipo MIME o extensión
 */
export async function extractTextFromFile(
  buffer: Buffer,
  filename: string,
  mimeType?: string
): Promise<string> {
  const ext = path.extname(filename).toLowerCase();

  // 1. Archivos PDF
  if (mimeType === "application/pdf" || ext === ".pdf") {
    const tempDir = path.resolve(process.cwd(), "uploads", "docs");
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    const tempPath = path.join(tempDir, `_temp_${Date.now()}_${filename.replace(/[^a-zA-Z0-9._-]/g, "_")}`);
    fs.writeFileSync(tempPath, buffer);

    try {
      const scriptPath = path.resolve(process.cwd(), "scripts", "parse-pdf.js");
      const { execFileSync } = require("child_process");
      const stdout = execFileSync(process.execPath, [scriptPath, tempPath], {
        encoding: "utf-8",
        maxBuffer: 30 * 1024 * 1024,
        timeout: 30000,
      });

      const parsed = JSON.parse(stdout);
      if (parsed.success && parsed.text) {
        return cleanExtractedText(parsed.text);
      }
      throw new Error("No se pudo extraer texto del PDF.");
    } catch (err: any) {
      console.error("[RAG Service] Error procesando PDF:", err);
      // Si el archivo no tiene texto (e.g. escaneo de imagen)
      throw new Error(`Error al leer el archivo PDF: ${err.stderr || err.message || "Estructura inválida o sin texto seleccionable"}`);
    } finally {
      try {
        if (fs.existsSync(tempPath)) {
          fs.unlinkSync(tempPath);
        }
      } catch {}
    }
  }

  // 2. Archivos Word (.docx)
  if (
    mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    ext === ".docx"
  ) {
    try {
      const result = await mammoth.extractRawText({ buffer });
      return cleanExtractedText(result.value || "");
    } catch (err: any) {
      console.error("[RAG Service] Error procesando DOCX con mammoth:", err);
      throw new Error(`No se pudo leer el archivo Word .docx: ${err.message}`);
    }
  }

  // 3. Archivos de texto plano (.txt, .md, .csv)
  if (
    mimeType?.startsWith("text/") ||
    [".txt", ".md", ".text", ".csv"].includes(ext)
  ) {
    const raw = buffer.toString("utf-8");
    return cleanExtractedText(raw);
  }

  throw new Error(`Formato de archivo no soportado: ${ext || mimeType}. Usa PDF, DOCX o TXT.`);
}

/**
 * Limpia caracteres de control y normaliza espacios en blanco
 */
function cleanExtractedText(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\t/g, " ")
    .replace(/[ \u00A0]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Divide el texto en fragmentos semánticos (chunks) con solapamiento
 */
export function chunkText(
  text: string,
  chunkSize: number = 700,
  overlap: number = 100
): string[] {
  if (!text || text.trim().length === 0) return [];

  if (text.length <= chunkSize) {
    return [text.trim()];
  }

  const chunks: string[] = [];
  let startIndex = 0;

  while (startIndex < text.length) {
    let endIndex = startIndex + chunkSize;

    if (endIndex < text.length) {
      const nextNewline = text.lastIndexOf("\n", endIndex);
      const nextPeriod = text.lastIndexOf(". ", endIndex);

      if (nextNewline > startIndex + chunkSize * 0.6) {
        endIndex = nextNewline + 1;
      } else if (nextPeriod > startIndex + chunkSize * 0.6) {
        endIndex = nextPeriod + 2;
      }
    } else {
      endIndex = text.length;
    }

    const chunk = text.slice(startIndex, endIndex).trim();
    if (chunk.length >= 30) {
      chunks.push(chunk);
    }

    startIndex = endIndex - overlap;
    if (startIndex >= text.length - overlap) break;
  }

  return chunks;
}

/**
 * Genera embeddings vectoriales de 1536 dimensiones mediante OpenRouter
 */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("No se encontró OPENROUTER_API_KEY configurada en el entorno.");
  }

  const baseUrl = process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1";
  const model = process.env.EMBEDDINGS_MODEL || "openai/text-embedding-3-small";

  const allEmbeddings: number[][] = [];
  const BATCH_SIZE = 16;

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);

    const res = await fetch(`${baseUrl}/embeddings`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        input: batch,
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error("[RAG Embeddings Error]:", res.status, errorText);
      throw new Error(`Error al generar embeddings en OpenRouter (${res.status}): ${errorText}`);
    }

    const data = await res.json();
    if (!data.data || !Array.isArray(data.data)) {
      throw new Error("Respuesta inválida de la API de embeddings.");
    }

    const sorted = [...data.data].sort((a: any, b: any) => a.index - b.index);
    for (const item of sorted) {
      if (Array.isArray(item.embedding)) {
        allEmbeddings.push(item.embedding);
      }
    }
  }

  return allEmbeddings;
}

/**
 * Guarda un documento físico, extrae su texto, calcula embeddings y lo persiste en PostgreSQL
 */
export async function ingestDocument(
  fileBuffer: Buffer,
  filename: string,
  mimeType: string
): Promise<ProcessedDocument> {
  // 1. Guardar archivo en disco
  const uploadsDir = path.resolve(process.cwd(), "uploads", "docs");
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  const safeName = `${Date.now()}_${filename.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  const diskPath = path.join(uploadsDir, safeName);
  fs.writeFileSync(diskPath, fileBuffer);

  // 2. Extraer texto limpio
  const extractedText = await extractTextFromFile(fileBuffer, filename, mimeType);
  if (!extractedText || extractedText.length < 20) {
    try {
      fs.unlinkSync(diskPath);
    } catch {}
    throw new Error(
      `El documento "${filename}" no contiene texto legible suficiente para indexar. Si es un PDF escaneado, asegúrate de que tenga capa de texto OCR.`
    );
  }

  // 3. Fragmentar en chunks
  const chunks = chunkText(extractedText);
  if (chunks.length === 0) {
    try {
      fs.unlinkSync(diskPath);
    } catch {}
    throw new Error("No se pudieron generar fragmentos semánticos a partir del documento.");
  }

  // 4. Generar embeddings vectoriales
  const embeddings = await generateEmbeddings(chunks);
  if (embeddings.length !== chunks.length) {
    try {
      fs.unlinkSync(diskPath);
    } catch {}
    throw new Error(
      `Error de sincronización de embeddings: se esperaban ${chunks.length} y se obtuvieron ${embeddings.length}.`
    );
  }

  // 5. Guardar en Base de Datos PostgreSQL
  const [doc] = await db
    .insert(knowledgeDocuments)
    .values({
      filename,
      fileSize: fileBuffer.length,
      mimeType,
      storagePath: path.relative(process.cwd(), diskPath),
      totalChunks: chunks.length,
    })
    .returning();

  // 6. Insertar chunks en lotes
  const chunkRows = chunks.map((content, idx) => ({
    documentId: doc.id,
    chunkIndex: idx,
    content,
    embedding: embeddings[idx],
  }));

  const CHUNK_INSERT_BATCH = 25;
  for (let i = 0; i < chunkRows.length; i += CHUNK_INSERT_BATCH) {
    const batch = chunkRows.slice(i, i + CHUNK_INSERT_BATCH);
    await db.insert(documentChunks).values(batch);
  }

  return {
    id: doc.id,
    filename: doc.filename,
    fileSize: doc.fileSize,
    mimeType: doc.mimeType,
    totalChunks: doc.totalChunks,
    createdAt: doc.createdAt.toISOString(),
  };
}

/**
 * Busca fragmentos relevantes en la base de datos vectorial mediante pgvector (<=> similitud coseno)
 */
export async function searchKnowledgeBase(
  query: string,
  topK: number = 4,
  minSimilarity: number = 0.35
): Promise<ChunkMatch[]> {
  const trimmed = (query || "").trim();
  if (!trimmed) return [];

  // 1. Generar embedding para la consulta
  const [queryEmbedding] = await generateEmbeddings([trimmed]);
  if (!queryEmbedding) return [];

  const vectorStr = `[${queryEmbedding.join(",")}]`;

  // 2. Consulta SQL nativa con operador <=> de pgvector
  const results = await db.execute(sql`
    SELECT 
      dc.id,
      dc.document_id as "documentId",
      dc.chunk_index as "chunkIndex",
      dc.content,
      kd.filename,
      ROUND((1 - (dc.embedding <=> ${vectorStr}::vector))::numeric, 4) as similarity
    FROM document_chunks dc
    JOIN knowledge_documents kd ON dc.document_id = kd.id
    WHERE (1 - (dc.embedding <=> ${vectorStr}::vector)) >= ${minSimilarity}
    ORDER BY similarity DESC
    LIMIT ${topK}
  `);

  const rawRows: any[] = (results as any).rows || results;
  return rawRows.map((r: any) => ({
    id: r.id,
    documentId: r.documentId,
    filename: r.filename,
    chunkIndex: Number(r.chunkIndex),
    content: r.content,
    similarity: Number(r.similarity),
  }));
}

/**
 * Elimina un documento y limpia sus archivos físicos y fragmentos asociados
 */
export async function deleteKnowledgeDocument(id: string): Promise<boolean> {
  const [doc] = await db
    .select()
    .from(knowledgeDocuments)
    .where(eq(knowledgeDocuments.id, id))
    .limit(1);

  if (!doc) return false;

  await db.delete(knowledgeDocuments).where(eq(knowledgeDocuments.id, id));

  try {
    const fullPath = path.resolve(process.cwd(), doc.storagePath);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
  } catch (e) {
    console.warn("[RAG Service] Error al eliminar archivo físico:", e);
  }

  return true;
}
