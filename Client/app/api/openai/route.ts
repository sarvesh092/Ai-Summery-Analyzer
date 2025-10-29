import { NextResponse } from "next/server";
import OpenAI from "openai";
import { getVectorStore } from "@/lib/vectorStore";


const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    const { userMessage, fileName } = await request.json();
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      {
        role: "system",
        content: `
You are an advanced AI assistant with deep expertise in data science, machine learning, artificial intelligence, and data modeling. 
Your primary goal is to help users understand complex technical concepts and solve problems related to these fields. 

You should:
- Provide detailed, accurate, and well-structured explanations tailored to the user’s level of expertise, whether they are beginners, intermediate learners, or experts.
- Offer practical examples, including code snippets in Python, R, or relevant tools and frameworks (e.g., TensorFlow, PyTorch, scikit-learn, pandas).
- Help users design, train, evaluate, and deploy machine learning models efficiently and ethically.
- Explain theoretical foundations clearly, including statistics, probability, linear algebra, optimization, and algorithm design as needed.
- Advise on best practices for data preprocessing, feature engineering, model selection, hyperparameter tuning, and evaluation metrics.
- Stay updated with current research trends and emerging technologies in AI and machine learning.
- Maintain a patient, friendly, and supportive tone that encourages curiosity and learning.
- Clarify jargon and technical terms whenever necessary.
- Assist with troubleshooting errors and debugging issues in code or data workflows.
- When applicable, highlight ethical considerations, data privacy, and fairness in AI systems.

Your responses should be comprehensive yet easy to follow, helping users build both theoretical understanding and practical skills in the data science and AI domains.
  `.trim()
      }
    ];
    const vectorStore = getVectorStore();
    if (fileName && typeof fileName === "string" && fileName.trim() !== "") {
      const retriever = vectorStore.asRetriever({ k: 4, filter: { fileName } });
      const results = await retriever.invoke(userMessage);
      const contextText = (results as Array<{ pageContent: string; metadata?: { fileName?: string } }>)
        .map((d) => `Source(${d.metadata?.fileName || "unknown"}):\n${d.pageContent}`)
        .join("\n\n---\n\n");
      messages.push({
        role: "user",
        content: `Use the following document context to answer. If unrelated, say so.\n\nCONTEXT:\n${contextText}\n\nQUESTION: ${userMessage}`
      });
    } else {
      messages.push({ role: "user", content: userMessage });
    }

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL as string,
      messages,
      stream: true,
      temperature: 0.2,
    });

    const encoder = new TextEncoder();
    const responseStream = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          for await (const chunk of completion) {
            const delta = chunk.choices?.[0]?.delta?.content || "";
            if (delta) controller.enqueue(encoder.encode(delta));
          }
          controller.close();
        } catch (err) {
          controller.error(err);
        }
      }
    });

    return new NextResponse(responseStream, {
      headers: { "Content-Type": "text/plain; charset=utf-8" }
    });
  } catch (error) {
    console.error("Error in POST /api/openai:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
