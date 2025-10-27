"use client";

import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github-dark.css";
import { Upload, Send } from "lucide-react";

interface Message {
  role: "User" | "system";
  message: string;
}

const ChatPage = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [fileUrl, setFileUrl] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  console.log("File URL:", fileUrl);
  const [dots, setDots] = useState("");
  useEffect(() => {
    if (!loading) return;
    const interval = setInterval(() => {
      setDots((prev) => (prev.length < 3 ? prev + "." : ""));
    }, 500);
    return () => clearInterval(interval);
  }, [loading]);

  // Auto-scroll on new messages
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  useEffect(() => {
    const fetchFileUrl = async () => {
      try {
        const res = await fetch("/api/allFiles");
        const data = await res.json();
        setFileUrl(data.files);
      } catch (error) {
        console.error("Error fetching file URL:", error);
      }
    };
    fetchFileUrl();
  }, [uploadedFileName]);

  const handleSend = async () => {
    if (!input.trim()) return alert("Please enter a message");

    setMessages((prev) => [...prev, { role: "User", message: input }]);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch("/api/openai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userMessage: input,
          fileName:
            selectedFile && selectedFile.trim() !== "" ? selectedFile : null,
        }),
      });
      if (!response.ok) {
        throw new Error();
      }
      if (!response.body) throw new Error("No response body");

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let aiMessage = "";

      setMessages((prev) => [...prev, { role: "system", message: "" }]);

      let firstChunk = true;
      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        if (value) {
          const chunk = decoder.decode(value);
          aiMessage += chunk;

          if (firstChunk) {
            setLoading(false);
            setDots("");
            firstChunk = false;
          }

          setMessages((prev) => {
            const updated = [...prev];
            updated[updated.length - 1] = {
              role: "system",
              message: aiMessage,
            };
            return updated;
          });
        }
      }
    } catch (error) {
      console.log("Error streaming response:", error);
      setMessages((prev) => [
        ...prev,
        { role: "system", message: "Error: Unable to get response." },
      ]);
      setLoading(false);
      setDots("");
    } finally {
      setLoading(false);
      setDots("");
    }
  };
  const handleFileUpload = async () => {
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/uploadFile", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        console.log("Upload failed");
        return;
      }
      const { fileObj } = await res.json();
      console.log("File uploaded:", fileObj);
      setUploadedFileName(fileObj.fileName);
      setFile(null);
    } catch (error) {
      console.error("Error uploading file:", error);
    }
  };
  console.log("Selected file:", selectedFile, typeof selectedFile);
  return (
    <div className="flex h-screen bg-slate-900">
      {/* Upload Section */}
      <div className="w-80 flex-shrink-0 border-r border-slate-700/50 bg-slate-800/50 flex flex-col h-full">
        <div className="p-4 border-b border-slate-700/50">
          <h2 className="text-lg font-semibold text-white mb-4">
            Upload Documents
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Choose a file
              </label>
              <div className="flex gap-2">
                <label className="flex-1 cursor-pointer">
                  <div className="flex items-center justify-between px-4 py-2 bg-slate-700/50 hover:bg-slate-700/70 rounded-lg border border-slate-600/50 transition-colors">
                    <div className="flex items-center">
                      <Upload className="w-4 h-4 mr-2 text-cyan-400" />
                      <span className="text-slate-200 text-sm truncate">
                        {file ? file.name : "Select file..."}
                      </span>
                    </div>
                    <input
                      type="file"
                      className="hidden"
                      accept=".pdf"
                      onChange={(e) => {
                        setFile(e.target.files?.[0] || null);
                        setUploadedFileName(null);
                      }}
                    />
                  </div>
                </label>
                <button
                  onClick={handleFileUpload}
                  disabled={!file}
                  className="px-3 py-2 bg-cyan-600 cursor-pointer hover:bg-cyan-500 text-white rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Upload
                </button>
              </div>
              {uploadedFileName && (
                <p className="mt-2 text-xs text-emerald-400">
                  Uploaded:{" "}
                  <span className="font-medium">{uploadedFileName}</span>
                </p>
              )}
            </div>

            {fileUrl.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-slate-300 mb-2">
                  Available Files
                </h3>
                <div className="space-y-1 max-h-48 overflow-y-auto pr-2">
                  {fileUrl.map((availableFile) => (
                    <label
                      key={availableFile}
                      className="flex items-center p-2 hover:bg-slate-700/30 rounded-lg cursor-pointer transition-colors group"
                    >
                      <input
                        type="checkbox"
                        checked={selectedFile === availableFile}
                        onChange={() => {
                          setSelectedFile(prev => 
                            prev === availableFile ? null : availableFile
                          );
                        }}
                        className="h-3.5 w-3.5 text-cyan-500 border-slate-600 rounded focus:ring-cyan-500"
                      />
                      <span className="ml-3 text-sm text-slate-300 group-hover:text-white truncate">
                        {availableFile}
                      </span>
                      {selectedFile === availableFile && (
                        <span className="ml-auto w-2 h-2 bg-cyan-500 rounded-full"></span>
                      )}
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="p-4 border-t border-slate-700/50 mt-auto">
          <div className="text-xs text-slate-500">
            <p>Supported formats: PDF, MD, TXT</p>
            <p className="mt-1">Max file size: 10MB</p>
          </div>
        </div>
      </div>

      {/*Chat Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <main
          ref={scrollRef}
          className="flex-1 overflow-y-auto bg-gradient-to-b from-slate-900 to-slate-900/80"
        >
          <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[70vh] text-center px-4">
                <div className="max-w-md">
                  <h2 className="text-2xl font-semibold text-white mb-3">
                    How can I help you today?
                  </h2>
                  <p className="text-slate-400">
                    Upload a document to get started, or ask me anything!
                  </p>
                </div>
              </div>
            ) : (
              messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.role === "User" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-2xl rounded-2xl px-4 py-3 ${
                      msg.role === "User"
                        ? "bg-cyan-600 text-white rounded-br-none"
                        : "bg-slate-800 text-slate-200 rounded-bl-none"
                    }`}
                  >
                    <div className="prose prose-invert max-w-none prose-sm">
                      <ReactMarkdown rehypePlugins={[rehypeHighlight]}>
                        {msg.message}
                      </ReactMarkdown>
                    </div>
                  </div>
                </div>
              ))
            )}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-slate-800 text-slate-200 px-4 py-3 rounded-2xl rounded-bl-none flex items-center gap-2">
                  <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></div>
                  <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse delay-150"></div>
                  <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse delay-300"></div>
                </div>
              </div>
            )}
          </div>
        </main>

        <footer className="bg-slate-800/80 backdrop-blur-md border-t border-slate-700/50 p-4">
          <div className="max-w-3xl mx-auto relative">
            <div className="relative">
              <textarea
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Message AI..."
                className="w-full min-h-[44px] max-h-32 rounded-xl border border-slate-600/50 bg-slate-700/50 text-slate-200 placeholder-slate-400 pl-4 pr-12 py-3 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-transparent transition-all resize-none"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    if (input.trim()) handleSend();
                  }
                }}
                style={{
                  scrollbarWidth: "thin",
                  scrollbarColor: "#06b6d4 transparent",
                }}
              />
              <button
                onClick={() => input.trim() && handleSend()}
                disabled={!input.trim()}
                className="absolute right-2 bottom-4 p-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                aria-label="Send message"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-center text-slate-500 mt-2">
              AI can make mistakes. Consider checking important information.
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default ChatPage;
