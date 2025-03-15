import { FileState, GoogleGenAI, Type } from '@google/genai';
import { GeminiContextContent, WhatsappResponseAsText } from '../types';
import { addLog } from './controlPanel';
import { GEMINI_API_KEY, GEMINI_MODEL } from '../config';
import { getBotName, getCustomPrompt } from './botSettings';
import { MessageMedia } from 'whatsapp-web.js';

const generateImage = async (prompt: string) => {
  const client = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
  const response = await client.models.generateContent({
    model: 'gemini-2.0-flash-exp',
    config: {
      responseModalities: ['Image'],
    },
    contents: prompt,
  });
  if (response && response.candidates) {
    response.candidates[0].content?.parts?.forEach(async (part) => {
      if (part.inlineData && part.inlineData.data && part.inlineData.mimeType) {
        const base64Data = part.inlineData.data.replace(
          /^data:image\/\w+;base64,/,
          '',
        );
        return new MessageMedia(
          part.inlineData.mimeType,
          base64Data,
          null,
          null,
        );
      }
    });
  }
  return undefined;
};

const removeBotName = (message: GeminiContextContent) => {
  const botName = getBotName();
  // Check if bot name is mentioned in the message
  if (
    message.parts[0].text &&
    message.parts[0].text.toLowerCase().includes(botName.toLowerCase())
  ) {
    // Remove bot name from message for processing
    message.parts[0].text = message.parts[0].text
      .replace(new RegExp(botName, 'gi'), '')
      .trim();
  }
};

export const processGeminiResponse = async (
  from: string,
  messageList: GeminiContextContent[],
): Promise<WhatsappResponseAsText> => {
  addLog('Processing Gemini response.');
  // context history has to start with a user message for gemini
  while (messageList[0].role === 'model') {
    messageList.shift();
  }
  const client = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
  let systemInstruction = {
    text: `Your name is ${getBotName()}. ${getCustomPrompt()}. If you get a request to generate an image, do not throw an error, call the function for generating images and you will be all good. `,
  };
  const lastMessage: GeminiContextContent =
    messageList.pop() as GeminiContextContent;
  removeBotName(lastMessage);
  let response;
  let media: MessageMedia | undefined;

  const generateImageFunctionDeclaration = {
    name: 'generateAndAttachImage',
    description: 'Generate an image when user prompts creation of an image and attach it to the response message.',
    parameters: {
      type: 'OBJECT' as Type,
      properties: {
        prompt: {
          type: 'STRING' as Type,
          description:
            "The text of the user's prompt describing the image to be generated.",
        },
      },
      required: ['prompt'],
    },
  };
  const getGeneratedImage = async (prompt: string) => {
    media = await generateImage(prompt);
  };

  const functions: {[key: string]: any} = {
    generateAndAttachImage: ({ prompt }: { prompt: string }) => {
      return getGeneratedImage(prompt);
    },
  };

  try {
    const chat = client.chats.create({
      model: GEMINI_MODEL,
      config: {
        systemInstruction: systemInstruction,
        tools: [
          {
            functionDeclarations: [generateImageFunctionDeclaration],
          },
        ],
      },
      history: messageList,
    });
    response = await chat.sendMessage({ message: lastMessage.parts });
    let call
    if (response.functionCalls) {
      call = response.functionCalls[0];
      if (call && call.name) {
        const apiResponse = await functions[call.name](call.args)
      }
    }
    // if (response && response.candidates) {
    //   response.candidates[0].content?.parts?.forEach(async (part) => {
    //     if (
    //       part.inlineData &&
    //       part.inlineData.data &&
    //       part.inlineData.mimeType
    //     ) {
    //       const base64Data = part.inlineData.data.replace(
    //         /^data:image\/\w+;base64,/,
    //         '',
    //       );
    //       media = new MessageMedia(
    //         part.inlineData.mimeType,
    //         base64Data,
    //         null,
    //         null,
    //       );
    //     }
    //   });
    // }
  } catch (error) {
    addLog(`Error fetching gemini response: ${error}`);
    return {
      from,
      messageContent: 'There was an error processing the request.',
      rawText: 'Error',
    };
  }
  return {
    from,
    messageContent: response.text
      ? response.text
      : media
      ? ''
      : 'There was a problem with your request.',
    messageMedia: media,
    rawText: response.text || 'Error.',
  };
};

export const uploadImageToGemini = async (
  base64String: string,
  mimeType: string,
) => {
  const client = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
  try {
    const imageBuffer = Buffer.from(base64String, 'base64');
    const fileBlob = new Blob([imageBuffer], { type: mimeType });
    let response = await client.files.upload({ file: fileBlob });
    const fileName = response.name;
    addLog(`Image upload to gemini started.`);
    while (response.state !== FileState.ACTIVE) {
      response = await client.files.get({ name: fileName as string });
    }
    addLog(`Image upload to gemini complete.`);
    return response.uri;
  } catch (error) {
    addLog(`Error uploading image to Gemini`);
    throw error;
  }
};
