import { MessageMedia } from "whatsapp-web.js";
import { saveAudioFile } from "./audio";

type ChatHistoryItem = { role: string; content: string; }

// Store logs in memory
export let logs: string[] = [];
export let chatHistory: ChatHistoryItem[] = []
export let whatsappConnected = false;

export const setChatHistory = (newChatHistory: ChatHistoryItem[]) => {
    chatHistory = newChatHistory
}

export const isAudioMessage = (content: string | MessageMedia) => {
    if (typeof content === "string") {
        return false;
    }
    return true;
}

export const addMessageContentString = (content: string | MessageMedia) => {
    const isAudio = isAudioMessage(content)
    if (!isAudio) {
        return content as string
    }
    const mediaContent = content as MessageMedia

    const audioUrl = saveAudioFile(mediaContent);

    return (
        `<audio controls>` +
        `<source src='${audioUrl}' type='${mediaContent.mimetype}' />` +
        'Your browser does not support the audio element.' +
        `</audio>`
    );
}

export const addLog = (message: string) => {
    console.log(message)
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${message}`;
    logs.unshift(logEntry); // Add to beginning of array
    if (logs.length > 100) logs.pop(); // Keep only last 100 logs
};

export const setWhatsAppConnected = (connected: boolean) => {
    whatsappConnected = connected;
};
