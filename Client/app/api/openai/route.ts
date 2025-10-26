import { NextResponse } from "next/server";
import { AzureOpenAI } from "openai";
import { ChatCompletionMessageParam } from "openai/resources/chat/completions.js";

const openai = new AzureOpenAI({
  apiKey: process.env.AZURE_OPENAI_API_KEY!,
  endpoint: process.env.AZURE_OPENAI_API_URL!,
  apiVersion: process.env.AZURE_OPENAI_VERSION!
});

export async function POST(request: Request) {
  try {
    const { userMessage, fileName } = await request.json();
    const messages: ChatCompletionMessageParam[] = [
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
    messages.push({ role: "user", content: userMessage });

    const stream = await openai.chat.completions.create({
      messages,
      stream: true,
      model: process.env.AZURE_OPENAI_ENGINE as string
    });

    const responseStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            let text = undefined;
            if (chunk.choices && chunk.choices[0]) {
              text = chunk.choices[0].delta?.content;
            }
            if (text) {
              const encoder = new TextEncoder();
              controller.enqueue(encoder.encode(text));
            }
          }
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      }
    });

    return new NextResponse(responseStream, {
      headers: { "Content-Type": "text/event-stream" }
    });
  } catch (error) {
    console.error("Error in POST /api/openai:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
