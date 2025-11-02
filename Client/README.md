# 🤖 AI Summary Analyzer

An **AI-powered web application** that automates document parsing, semantic search, and smart summary generation using **LangChain**, **OpenAI LLMs**, and **Next.js**.  
It enables users to upload complex documents (PDF, DOCX, Markdown) and receive intelligent, context-aware summaries — reducing manual reading time and improving information accessibility.

---

## 🚀 Overview

Manual document analysis can be time-consuming and inefficient.  
**AI Summary Analyzer** solves this by leveraging **Large Language Models (LLMs)** to perform real-time document parsing, semantic understanding, and summarization — allowing users to extract insights instantly from multiple file formats.

---

## ✨ Features

- 🧠 **AI-Powered Summarization:** Uses LangChain and OpenAI models to generate meaningful summaries and context-aware Q&A.
- 📄 **Multi-Format Support:** Handles PDF, DOCX, and Markdown files through a unified document parsing pipeline.
- 🔍 **Semantic Search:** Implements pgvector embeddings with LangChain retrievers to deliver relevant, high-accuracy responses.
- ⚙️ **Asynchronous Processing:** BullMQ-based job queues for background tasks and scalable data processing.
- 🐳 **Dockerized Microservices:** Enables containerized deployment and modular scalability.
- ☁️ **Cloud Integration:** Seamless integration with Google Cloud Storage for document handling and distributed workloads.
- 🧩 **Robust Architecture:** Clean, modular backend design supporting high throughput and future AI model extensions.

---

## 🧱 Tech Stack

**Frontend:** Next.js, TypeScript, Tailwind CSS  
**Backend:** Node.js, Express, LangChain, BullMQ, Redis  
**AI & Data Layer:** OpenAI API, pgvector, Supabase  
**Infrastructure:** Docker, Google Cloud Storage  


