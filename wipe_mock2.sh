sed -i 's/safeLoad<ChatMessage\[\]>('\''puremax_messages_v3'\'', INITIAL_CHAT_MESSAGES)/safeLoad<ChatMessage\[\]>('\''puremax_messages_v3'\'', [])/g' src/context/AppContext.tsx
