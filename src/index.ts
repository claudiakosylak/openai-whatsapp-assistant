import { Message, Client, LocalAuth } from "whatsapp-web.js";
import qrcode from "qrcode-terminal"
import { handleIncomingMessage } from "./utils/whatsapp";
import { startControlPanel } from "./controlPanel";
import { addLog, setWhatsAppConnected } from "./utils/controlPanel";

const client = new Client({
    authStrategy: new LocalAuth()
  });

client.on('qr', qr => {
    qrcode.generate(qr, {small: true});
  });

  client.on('ready', () => {
    addLog('WhatsApp client is ready');
    setWhatsAppConnected(true);
  });

  client.on('disconnected', () => {
    addLog('WhatsApp client disconnected');
    setWhatsAppConnected(false);
  });

  client.on('message', async (message: Message) => {
    handleIncomingMessage(client, message)
  });

  // used for testing so that you can message yourself on whatsapp with flag -test-bot
  client.on('message_create', async (message: Message) => {
    if (!message.body.includes("-test-bot")) return;
    if (!message.id.fromMe) return;
    handleIncomingMessage(client, message)
  })

  try {
    startControlPanel();
    addLog('Starting WhatsApp client');
    client.initialize();
  }catch (e: any){
    const errorMsg = `ERROR: ${e.message}`;
    console.error(errorMsg);
    addLog(errorMsg);
  }
