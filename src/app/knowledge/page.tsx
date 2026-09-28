"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  BookOpen,
  UploadCloud,
  FileText,
  Database,
  Trash2,
  CheckCircle2,
  Search,
  RefreshCw,
  Eye,
  X,
  AlertCircle,
  Sparkles,
  Layers,
  FileCheck2,
  ArrowRight,
  Cpu,
  Loader2,
  Copy,
  Check
} from "lucide-react";
import { toast } from "sonner";

interface KnowledgeDoc {
  id: string;
  filename: string;
  fileSize: number;
  mimeType: string;
  totalChunks: number;
  createdAt: string;
}

interface ChunkItem {
  id: string;
  chunkIndex: number;
  content: string;
  createdAt: string;
}

interface SearchMatch {
  id: string;
  documentId: string;
  filename: string;
  chunkIndex: number;
  content: string;
  similarity: number;
}

export default function KnowledgePage() {
  const [docs, setDocs] = useState<KnowledgeDoc[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchFilter, setSearchFilter] = useState("");

  // Upload States
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgressText, setUploadProgressText] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Chunks Modal
  const [selectedDocForChunks, setSelectedDocForChunks] = useState<KnowledgeDoc | null>(null);
  const [chunks, setChunks] = useState<ChunkItem[]>([]);
  const [isLoadingChunks, setIsLoadingChunks] = useState(false);
  const [copiedChunkId, setCopiedChunkId] = useState<string | null>(null);

  // RAG Query Tester
  const [testQuery, setTestQuery] = useState("");
  const [isTestingSearch, setIsTestingSearch] = useState(false);
  const [searchMatches, setSearchMatches] = useState<SearchMatch[] | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  // Load Documents from PostgreSQL
  const fetchDocuments = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/knowledge");
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.documents)) {
          setDocs(data.documents);
        }
      } else {
        toast.error("Error al cargar documentos de la base de datos.");
      }
    } catch (err) {
      console.error("Error fetching docs:", err);
      toast.error("No se pudo conectar con el servidor para consultar documentos.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  // Format File Size
  const formatBytes = (bytes: number): string => {
    if (!bytes || bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  // Format Date
  const formatDate = (isoString: string): string => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString("es-MX", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return isoString;
    }
  };

  // Upload Logic
  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];

    const validExtensions = [".pdf", ".docx", ".doc", ".txt", ".md"];
    const fileExt = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
    if (!validExtensions.includes(fileExt)) {
      toast.error(`Formato no soportado. Sube un archivo PDF, Word (.docx) o Texto (.txt).`);
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      toast.error("El archivo supera el límite de 20 MB.");
      return;
    }

    setIsUploading(true);
    setUploadProgressText("Leyendo y transfiriendo archivo...");

    try {
      const formData = new FormData();
      formData.append("file", file);

      setUploadProgressText("Extrayendo texto y calculando fragmentos semánticos...");

      // Timer visual mientras el servidor procesa y genera embeddings
      const t1 = setTimeout(() => {
        setUploadProgressText("Generando embeddings vectoriales 1536d con OpenRouter...");
      }, 1000);

      const t2 = setTimeout(() => {
        setUploadProgressText("Indexando vectores en pgvector (PostgreSQL)...");
      }, 2500);

      const res = await fetch("/api/knowledge/upload", {
        method: "POST",
        body: formData,
      });

      clearTimeout(t1);
      clearTimeout(t2);

      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(data.message || `Documento "${file.name}" indexado con éxito.`);
        await fetchDocuments();
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      } else {
        toast.error(data.message || "Error al procesar el archivo.");
      }
    } catch (err: any) {
      console.error("Upload error:", err);
      toast.error(`Error de red al subir documento: ${err.message}`);
    } finally {
      setIsUploading(false);
      setUploadProgressText("");
    }
  };

  // Drag & Drop Handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files);
    }
  };

  // Delete Document
  const handleDeleteDoc = async (id: string, name: string) => {
    if (!confirm(`¿Estás seguro de eliminar "${name}" y todos sus fragmentos vectoriales?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/knowledge?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(`Documento "${name}" eliminado.`);
        setDocs((prev) => prev.filter((d) => d.id !== id));
        if (selectedDocForChunks?.id === id) {
          setSelectedDocForChunks(null);
        }
      } else {
        toast.error(data.message || "Error al eliminar documento.");
      }
    } catch (err) {
      toast.error("No se pudo conectar con el servidor para eliminar.");
    }
  };

  // View Chunks Modal
  const handleOpenChunksModal = async (doc: KnowledgeDoc) => {
    setSelectedDocForChunks(doc);
    setIsLoadingChunks(true);
    setChunks([]);
    try {
      const res = await fetch(`/api/knowledge/${doc.id}/chunks`);
      const data = await res.json();
      if (res.ok && data.success) {
        setChunks(data.chunks || []);
      } else {
        toast.error("No se pudieron cargar los fragmentos.");
      }
    } catch (err) {
      toast.error("Error al obtener fragmentos del documento.");
    } finally {
      setIsLoadingChunks(false);
    }
  };

  // Copy chunk to clipboard
  const handleCopyChunk = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedChunkId(id);
    setTimeout(() => setCopiedChunkId(null), 2000);
    toast.success("Texto copiado al portapapeles");
  };

  // Test RAG Search
  const handleTestSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = testQuery.trim();
    if (!query) {
      toast.error("Escribe una pregunta para probar la búsqueda.");
      return;
    }

    setIsTestingSearch(true);
    setHasSearched(true);
    try {
      const res = await fetch("/api/knowledge/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, topK: 4, minSimilarity: 0.3 }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSearchMatches(data.matches || []);
      } else {
        toast.error(data.message || "Error al realizar búsqueda.");
        setSearchMatches([]);
      }
    } catch (err) {
      toast.error("Error al ejecutar búsqueda vectorial.");
      setSearchMatches([]);
    } finally {
      setIsTestingSearch(false);
    }
  };

  const filteredDocs = docs.filter((d) =>
    d.filename.toLowerCase().includes(searchFilter.toLowerCase())
  );

  const totalChunksCount = docs.reduce((acc, d) => acc + (d.totalChunks || 0), 0);

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50/70 overflow-y-auto select-none">
      {/* HEADER PRINCIPAL */}
      <header className="p-6 bg-white border-b border-slate-200 shrink-0">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-sm">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-bold text-slate-900 tracking-tight">
                    Folletos & Base de Conocimiento RAG
                  </h1>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    pgvector 1536d Activo
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Los bots de WhatsApp, Instagram y Facebook consultan estos folletos y pólizas en tiempo real para dar respuestas exactas.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={fetchDocuments}
              disabled={isLoading}
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors disabled:opacity-50"
              title="Refrescar lista de documentos"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin text-indigo-600" : ""}`} />
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium text-xs rounded-lg flex items-center gap-2 transition-all shadow-sm shadow-indigo-600/20"
            >
              <UploadCloud className="w-4 h-4" />
              {isUploading ? "Indexando..." : "Subir Documento"}
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => handleFileUpload(e.target.files)}
              accept=".pdf,.docx,.doc,.txt,.md"
              className="hidden"
            />
          </div>
        </div>
      </header>

      {/* CONTENEDOR PRINCIPAL */}
      <div className="p-6 max-w-6xl mx-auto w-full space-y-6">
        {/* BANNER TÉCNICO INFORMATIVO */}
        <div className="bg-gradient-to-r from-indigo-50 via-slate-50 to-indigo-50/50 border border-indigo-200/80 rounded-2xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-md shadow-indigo-500/20 shrink-0">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-indigo-950 flex items-center gap-2">
                Arquitectura de Recuperación Aumentada por Generación (RAG)
                <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded bg-indigo-100 text-indigo-700 border border-indigo-200">
                  openai/text-embedding-3-small
                </span>
              </div>
              <p className="text-[11px] text-slate-600 mt-1 leading-relaxed max-w-3xl">
                Al subir un documento, el motor extrae el texto puro, lo fragmenta en bloques con solapamiento contextual y genera vectores densos de 1536 dimensiones que se guardan en la tabla <code className="font-mono bg-indigo-100/60 px-1 py-0.5 rounded text-indigo-900">document_chunks</code> de PostgreSQL con índice HNSW y similitud coseno.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 shrink-0 bg-white/80 backdrop-blur px-4 py-2 rounded-xl border border-indigo-100 shadow-sm">
            <div className="text-center">
              <div className="text-base font-extrabold text-indigo-600">{docs.length}</div>
              <div className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">Folletos</div>
            </div>
            <div className="h-6 w-px bg-slate-200"></div>
            <div className="text-center">
              <div className="text-base font-extrabold text-slate-800">{totalChunksCount}</div>
              <div className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">Chunks</div>
            </div>
          </div>
        </div>

        {/* ZONA DE CARGA DRAG & DROP */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !isUploading && fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
            isDragging
              ? "border-indigo-500 bg-indigo-50/50 scale-[1.005]"
              : isUploading
              ? "border-indigo-300 bg-slate-50 cursor-wait"
              : "border-slate-300 hover:border-indigo-400 hover:bg-slate-50/80 bg-white"
          }`}
        >
          {isUploading ? (
            <div className="flex flex-col items-center justify-center py-3">
              <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mb-3" />
              <div className="text-sm font-bold text-slate-800">{uploadProgressText}</div>
              <p className="text-xs text-slate-500 mt-1 max-w-sm">
                Procesando embeddings y persistiendo vectores de 1536 dimensiones en la base de datos...
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <UploadCloud className="w-6 h-6" />
              </div>
              <div className="text-sm font-bold text-slate-800">
                Arrastra y suelta aquí tus folletos o pólizas, o <span className="text-indigo-600 underline">haz clic para examinar</span>
              </div>
              <p className="text-xs text-slate-400 mt-1.5">
                Formatos soportados: PDF, Word (.docx) o Texto plano (.txt) • Hasta 20 MB por documento
              </p>
              <div className="flex items-center gap-2 mt-3">
                <span className="text-[10px] font-medium bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200">
                  Condiciones Generales
                </span>
                <span className="text-[10px] font-medium bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200">
                  Folletos de Cobertura
                </span>
                <span className="text-[10px] font-medium bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200">
                  Preguntas Frecuentes / FAQs
                </span>
              </div>
            </div>
          )}
        </div>

        {/* SECCIÓN 1: PROBADOR DE BÚSQUEDA SEMÁNTICA (RAG TESTER) */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-amber-50 text-amber-600 rounded-lg border border-amber-200">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                  Probador en Vivo de Búsqueda Semántica RAG
                </h2>
                <p className="text-[11px] text-slate-500">
                  Prueba qué información recuperará el bot ante una pregunta real de un cliente usando similitud coseno.
                </p>
              </div>
            </div>
            <span className="text-[11px] text-slate-400 font-mono">
              Operador pgvector: <code className="text-indigo-600 font-bold">&lt;=&gt;</code>
            </span>
          </div>

          <form onSubmit={handleTestSearch} className="flex gap-2.5">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={testQuery}
                onChange={(e) => setTestQuery(e.target.value)}
                placeholder="Ejemplo: ¿Cuánto es el deducible por robo total? o ¿Qué cubre la póliza amplia de auto?"
                className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all placeholder:text-slate-400"
              />
            </div>
            <button
              type="submit"
              disabled={isTestingSearch || !testQuery.trim()}
              className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-semibold rounded-xl flex items-center gap-2 transition-colors shadow-sm shrink-0"
            >
              {isTestingSearch ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Buscando en pgvector...
                </>
              ) : (
                <>
                  <Cpu className="w-3.5 h-3.5 text-indigo-400" />
                  Probar Consulta
                </>
              )}
            </button>
          </form>

          {/* RESULTADOS DEL TESTER */}
          {hasSearched && (
            <div className="pt-2 border-t border-slate-100">
              {searchMatches && searchMatches.length > 0 ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
                    <span>
                      Se encontraron <strong className="text-indigo-600">{searchMatches.length} fragmentos</strong> más relevantes para: &quot;{testQuery}&quot;
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {searchMatches.map((m, idx) => (
                      <div
                        key={m.id || idx}
                        className="bg-slate-50/90 border border-slate-200/90 rounded-xl p-3.5 hover:border-indigo-300 transition-colors flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <span className="text-[11px] font-bold text-slate-800 truncate flex items-center gap-1.5">
                              <FileText className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                              {m.filename}
                            </span>
                            <span
                              className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                                m.similarity >= 0.5
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : "bg-amber-50 text-amber-700 border-amber-200"
                              }`}
                            >
                              {(m.similarity * 100).toFixed(1)}% Similitud
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 leading-relaxed line-clamp-4 bg-white p-2.5 rounded-lg border border-slate-200/70 font-sans">
                            {m.content}
                          </p>
                        </div>
                        <div className="mt-2.5 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[10px] text-slate-400">
                          <span>Fragmento #{m.chunkIndex + 1}</span>
                          <button
                            onClick={() => handleCopyChunk(m.id, m.content)}
                            className="hover:text-indigo-600 flex items-center gap-1 transition-colors"
                          >
                            {copiedChunkId === m.id ? (
                              <span className="text-emerald-600 flex items-center gap-0.5">
                                <Check className="w-3 h-3" /> Copiado
                              </span>
                            ) : (
                              <span className="flex items-center gap-0.5">
                                <Copy className="w-3 h-3" /> Copiar texto
                              </span>
                            )}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="py-6 text-center text-xs text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <AlertCircle className="w-5 h-5 text-slate-400 mx-auto mb-1.5" />
                  No se encontraron fragmentos con suficiente similitud semántica para esa consulta.
                </div>
              )}
            </div>
          )}
        </div>

        {/* SECCIÓN 2: INVENTARIO DE DOCUMENTOS INDEXADOS */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Filtrar por nombre de archivo..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="text-xs text-slate-500 font-medium">
              Mostrando <strong className="text-slate-800">{filteredDocs.length}</strong> de {docs.length} documentos indexados
            </div>
          </div>

          {isLoading ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
              <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto mb-2" />
              <p className="text-xs text-slate-500">Cargando base de conocimiento de PostgreSQL...</p>
            </div>
          ) : filteredDocs.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3">
                <FileCheck2 className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">No hay documentos indexados</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Sube las condiciones de tus pólizas, folletos de seguros o manuales de atención para que el bot pueda responder a tus clientes.
              </p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs rounded-lg inline-flex items-center gap-1.5 transition-colors"
              >
                <UploadCloud className="w-4 h-4" />
                Subir primer documento
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden divide-y divide-slate-100">
              {filteredDocs.map((doc) => (
                <div
                  key={doc.id}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/80 transition-colors"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold text-slate-900 truncate" title={doc.filename}>
                        {doc.filename}
                      </h3>
                      <div className="flex flex-wrap items-center gap-2.5 text-[11px] text-slate-400 mt-0.5">
                        <span>{formatBytes(doc.fileSize)}</span>
                        <span>•</span>
                        <span className="text-indigo-600 font-semibold flex items-center gap-1">
                          <Layers className="w-3 h-3" />
                          {doc.totalChunks} fragmentos (chunks)
                        </span>
                        <span>•</span>
                        <span>{formatDate(doc.createdAt)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center">
                    <span className="text-[11px] bg-emerald-50 text-emerald-700 font-semibold px-2.5 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      Vectorizado en BD
                    </span>

                    <button
                      onClick={() => handleOpenChunksModal(doc)}
                      className="px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg border border-slate-200 hover:border-indigo-200 flex items-center gap-1.5 transition-colors"
                      title="Ver fragmentos de texto vectorizados"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Ver Chunks</span>
                    </button>

                    <button
                      onClick={() => handleDeleteDoc(doc.id, doc.filename)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg border border-transparent hover:border-rose-200 transition-colors"
                      title="Eliminar documento y sus vectores"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* MODAL DE VISUALIZACIÓN DE CHUNKS */}
      {selectedDocForChunks && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
                  <Layers className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-slate-900 truncate">
                    Fragmentos de: {selectedDocForChunks.filename}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Total: {selectedDocForChunks.totalChunks} chunks indexados con vectores de 1536 dimensiones
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedDocForChunks(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-4 bg-slate-50/50">
              {isLoadingChunks ? (
                <div className="py-12 text-center">
                  <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto mb-2" />
                  <p className="text-xs text-slate-500">Cargando fragmentos...</p>
                </div>
              ) : chunks.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-500">
                  No se encontraron fragmentos para este documento.
                </div>
              ) : (
                chunks.map((chunk) => (
                  <div
                    key={chunk.id}
                    className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-2 hover:border-indigo-300 transition-colors"
                  >
                    <div className="flex items-center justify-between text-xs border-b border-slate-100 pb-2">
                      <span className="font-bold text-indigo-600">
                        Fragmento #{chunk.chunkIndex + 1}
                      </span>
                      <div className="flex items-center gap-3 text-slate-400 text-[11px]">
                        <span>{chunk.content.length} caracteres</span>
                        <button
                          onClick={() => handleCopyChunk(chunk.id, chunk.content)}
                          className="hover:text-indigo-600 flex items-center gap-1 transition-colors"
                        >
                          {copiedChunkId === chunk.id ? (
                            <span className="text-emerald-600 flex items-center gap-0.5 font-semibold">
                              <Check className="w-3 h-3" /> Copiado
                            </span>
                          ) : (
                            <span className="flex items-center gap-0.5">
                              <Copy className="w-3 h-3" /> Copiar
                            </span>
                          )}
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap font-sans">
                      {chunk.content}
                    </p>
                  </div>
                ))
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 bg-white flex justify-end">
              <button
                onClick={() => setSelectedDocForChunks(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
