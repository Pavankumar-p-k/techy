import { ChatClient } from "@/components/messages/ChatClient";

interface ChatPageProps {
  params: Promise<{ conversationId: string }>;
}

export default async function ChatPage({ params }: ChatPageProps) {
  const { conversationId } = await params;
  return <ChatClient conversationId={conversationId} />;
}
