"use client";

import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github-dark.css";

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
      behavior: "smooth"
    });
  }, [messages]);

  useEffect(() => {
    const fetchFileUrl = async () => {
      try {
        const res = await fetch("/api/uploadedFiles");
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
            selectedFile && selectedFile.trim() !== "" ? selectedFile : null
        })
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

          // Hide loader as soon as first chunk arrives
          if (firstChunk) {
            setLoading(false);
            setDots("");
            firstChunk = false;
          }

          setMessages((prev) => {
            const updated = [...prev];
            updated[updated.length - 1] = {
              role: "system",
              message: aiMessage
            };
            return updated;
          });
        }
      }
    } catch (error) {
      console.log("Error streaming response:", error);
      setMessages((prev) => [
        ...prev,
        { role: "system", message: "Error: Unable to get response." }
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
        body: formData
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
    <div className="flex flex-col h-screen bg-gradient-to-b from-sky-800 via-cyan-600 to-cyan-600">
      <header className="p-6 pt-2 pb-2 bg-[#155e75] backdrop-blur-md border-b border-white/40 shadow-md posit">
        <h1 className="text-3xl font-bold text-white drop-shadow-md">
          Ai Summary Analyzer
        </h1>
      </header>
      <div className="border border-gray-300 rounded p-4 space-y-4">
        <h2 className="text-xl font-semibold">📄 Upload a Document</h2>
        <input
          type="file"
          accept=".pdf,.md,.txt,.doc,.docx,.xls,.xlsx"
          onChange={(e) => {
            setFile(e.target.files?.[0] || null);
            setUploadedFileName(null);
          }}
        />
        <button
          className="bg-blue-600 text-white px-4 py-2 rounded"
          onClick={handleFileUpload}
        >
          Upload
        </button>
        {uploadedFileName && (
          <p className="text-green-600">Uploaded: {uploadedFileName}</p>
        )}
        {fileUrl?.map((availablefiles: string) => (
          <label className="flex items-center space-x-2" key={availablefiles}>
            <input
              type="checkbox"
              checked={selectedFile === availablefiles}
              onChange={(e) => {
                setSelectedFile(e.target.checked ? availablefiles : "");
              }}
              multiple={false}
            />
            <span>{availablefiles}</span>
          </label>
        ))}
      </div>
      <main
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-6 py-6 space-y-4 scrollbar-thin scrollbar-thumb-cyan-800 scrollbar-track-sky-800"
      >
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`max-w-xl px-5 py-3 rounded-2xl break-words mx-auto ${
              msg.role === "User"
                ? "bg-cyan-500 text-white rounded-br-none shadow-lg"
                : "ai-message bg-slate-900 text-cyan-300 rounded-bl-none"
            }`}
          >
            <div className="max-w-full break-words whitespace-pre-wrap">
              <ReactMarkdown rehypePlugins={[rehypeHighlight]}>
                {msg.message}
              </ReactMarkdown>
            </div>
          </div>
        ))}
        {loading && (
          <div className="max-w-xl px-5 py-3 rounded-2xl break-words mx-auto bg-[#1e293b] text-white rounded-bl-none shadow flex items-center gap-2">
            <span className="font-semibold">Thinking</span>
            <span className="dots-loader" style={{ letterSpacing: 2 }}>
              {dots}
            </span>
          </div>
        )}
      </main>

      <footer className="bg-white/20 backdrop-blur-md border-t border-white/40 p-4 flex items-center gap-4 sticky bottom-0">
        <textarea
          rows={2}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your message..."
          className="flex-1 resize-none rounded-xl border border-white/50 bg-white/30 px-4 py-3 text-white placeholder-white/80 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent transition"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
        />
        <button
          onClick={handleSend}
          className="bg-gradient-to-r from-cyan-500 via-sky-500 to-cyan-600 px-6 py-3 rounded-xl font-semibold text-white shadow-lg hover:brightness-110 active:scale-95 transition"
        >
          Ask the AI
        </button>
      </footer>
    </div>
  );
};

export default ChatPage;
