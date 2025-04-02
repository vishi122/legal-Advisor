const chatBody = document.querySelector(".chat-body");
const messageInput = document.querySelector(".message-input");
const sendMessageButton = document.querySelector("#send-message");
const fileInput = document.querySelector("#file-input");
const fileUploadWrapper = document.querySelector(".file-upload-wrapper");
const fileCancelButton = document.querySelector("#file-cancel");

// Store API key securely in a backend, don't expose it in frontend
const API_KEY = "AIzaSyBsZrZLwvQSjZgmukPdURAcNRKjmx9GScA";  
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`;

const userData = {
    message: null,
    file: { data: null, mime_type: null }
};

let lastUploadFile=null;
const conversationHistory=[];


// Create message elements dynamically
const createMessageElement = (content, ...classes) => {
    const div = document.createElement("div");
    div.classList.add("message", ...classes);
    div.innerHTML = content;
    return div;
};

// Generate bot response using API
const generateBotResponse = async (incomingMessageDiv) => {
    const messageElement = incomingMessageDiv.querySelector(".message-text");

    const requestOptions = {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            contents: [{
                parts: [
                    { text: userData.message },
                    ...(userData.file.data ? [{ inline_data: userData.file }] : [])
                ]
            }]
        })
    };

    try {
        const response = await fetch(API_URL, requestOptions);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error?.message || "Unknown error");

        console.log(data);

        // Extract bot's response and format text properly
        const botMessage = data.candidates?.[0]?.content?.parts?.[0]?.text
        .replace(/[`*]/g, "") // Remove unwanted symbols (* and `)
        .replace(/\*\*(.*?)\*\*/g, "<b>$1</b>") // Bold text
        .replace(/\*(.*?)\*/g, "<i>$1</i>") // Italic text
        .replace(/\n/g, "<br>") // New line to <br>
        .trim() || "Sorry, I couldn't understand that.";
    
        conversationHistory.push({role:"bot",text:botMessage})
        // Update bot message in UI
        messageElement.innerHTML = botMessage; // Use innerHTML for formatted text
    } catch (error) {
        console.error(error);
        messageElement.innerText = `Error: ${error.message}`;
        incomingMessageDiv.classList.add("error");
    } finally {
        userData.file = { data: null, mime_type: null };
        incomingMessageDiv.classList.remove("thinking");
        chatBody.scrollTo({ top: chatBody.scrollHeight, behavior: "smooth" });
    }
};

// Handle user message
const handleOutgoingMessage = (e) => {
    e.preventDefault();
    const userMessage = messageInput.value.trim();
    if (!userMessage) return;

    fileUploadWrapper.classList.remove("file-uploaded"); 
    userData.message = userMessage; 

    if(!userData.file.data && lastUploadFile){
        userData.file=lastUploadFile;
    }

    conversationHistory.push({role:"user",text:userMessage,file:userData.file});

    const messageContent = `
        <div class="message-text">${userData.message}</div>
        ${userData.file.data ? `<img src="data:${userData.file.mime_type};base64,${userData.file.data}" class="attachment"/>` : ""}
    `;

    const outgoingMessageDiv = createMessageElement(messageContent, "user-message");
    chatBody.appendChild(outgoingMessageDiv);
    messageInput.value = ""; 
    chatBody.scrollTo({ top: chatBody.scrollHeight, behavior: "smooth" });

    // Show bot thinking animation
    setTimeout(() => {
        const thinkingMessageContent = `
            <svg class="bot-avatar" xmlns="http://www.w3.org/2000/svg" width="50" height="50" viewBox="0 0 1024 1024">
                <path d="M738.3 287.6H285.7c-59 0-106.8 47.8-106.8 106.8v303.1c0 59 47.8 106.8 106.8 106.8h81.5v111.1c0 .7.8 1.1 1.4.7l166.9-110.6 41.8-.8h117.4l43.6-.4c59 0 106.8-47.8 106.8-106.8V394.5c0-59-47.8-106.9-106.8-106.9zM351.7 448.2c0-29.5 23.9-53.5 53.5-53.5s53.5 23.9 53.5 53.5-23.9 53.5-53.5 53.5-53.5-23.9-53.5-53.5zm157.9 267.1c-67.8 0-123.8-47.5-132.3-109h264.6c-8.6 61.5-64.5 109-132.3 109zm110-213.7c-29.5 0-53.5-23.9-53.5-53.5s23.9-53.5 53.5-53.5 53.5 23.9 53.5 53.5-23.9 53.5-53.5 53.5z"></path>
            </svg>
            <div class="message-text">
                <div class="thinking-indicator">
                    <div class="dot"></div>
                    <div class="dot"></div>
                    <div class="dot"></div>
                </div>
            </div>`;
        const incomingMessageDiv = createMessageElement(thinkingMessageContent, "bot-message", "thinking");
        chatBody.appendChild(incomingMessageDiv);
        chatBody.scrollTo({ top: chatBody.scrollHeight, behavior: "smooth" });

        generateBotResponse(incomingMessageDiv);
    }, 600);
};

// Handle "Enter" key event
messageInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") handleOutgoingMessage(e);
});

// Handle file selection
fileInput.addEventListener("change", () => {
    const file = fileInput.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        fileUploadWrapper.querySelector("img").src = e.target.result;
        fileUploadWrapper.classList.add("file-uploaded");

        lastUploadFile.file = {
            data: e.target.result.split(",")[1],
            mime_type: file.type
        };
        fileInput.value = "";
    };
    reader.readAsDataURL(file);
});

// Handle file cancel
fileCancelButton.addEventListener("click", () => {
    userData.file = { data: null, mime_type: null };
    fileUploadWrapper.classList.remove("file-uploaded");
});

// Initialize Emoji Picker
const picker = new EmojiMart.Picker({
    theme: "light",
    skinTonePosition: "none",
    previewPosition: "none",
    onEmojiSelect: (emoji) => {
        const { selectionStart, selectionEnd } = messageInput;
        messageInput.setRangeText(emoji.native, selectionStart, selectionEnd, "end");
        messageInput.focus();
    }
});

// Append picker only if chat form exists
const chatForm = document.querySelector(".chat-form");
if (chatForm) chatForm.appendChild(picker);

// Toggle emoji picker visibility
document.querySelector("#emoji-picker").addEventListener("click", (e) => {
    document.body.classList.toggle("show-emoji-picker");
    e.stopPropagation();
});

// Close emoji picker on outside click
document.addEventListener("click", (e) => {
    if (!e.target.closest(".emoji-mart")) {
        document.body.classList.remove("show-emoji-picker");
    }
});

// Handle send button click
sendMessageButton.addEventListener("click", handleOutgoingMessage);

// Handle file upload button click
document.querySelector("#file-upload").addEventListener("click", () => fileInput.click());

const chatBody = document.querySelector(".chat-body");
const messageInput = document.querySelector(".message-input");
const sendMessageButton = document.querySelector("#send-message");
const fileInput = document.querySelector("#file-input");
const fileUploadWrapper = document.querySelector(".file-upload-wrapper");
const fileCancelButton = document.querySelector("#file-cancel");

// Store API key securely in a backend, don't expose it in frontend
const API_KEY = "AIzaSyBsZrZLwvQSjZgmukPdURAcNRKjmx9GScA";  
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`;

const userData = {
    message: null,
    file: { data: null, mime_type: null }
};

let lastUploadFile=null;
const conversationHistory=[];


// Create message elements dynamically
const createMessageElement = (content, ...classes) => {
    const div = document.createElement("div");
    div.classList.add("message", ...classes);
    div.innerHTML = content;
    return div;
};

// Generate bot response using API
const generateBotResponse = async (incomingMessageDiv) => {
    const messageElement = incomingMessageDiv.querySelector(".message-text");

    const requestOptions = {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            contents: [{
                parts: [
                    { text: userData.message },
                    ...(userData.file.data ? [{ inline_data: userData.file }] : [])
                ]
            }]
        })
    };

    try {
        const response = await fetch(API_URL, requestOptions);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error?.message || "Unknown error");

        // console.log(data);

        // Extract bot's response and format text properly
        const botMessage = data.candidates?.[0]?.content?.parts?.[0]?.text
        .replace(/[`*]/g, "") // Remove unwanted symbols (* and `)
        .replace(/\*\*(.*?)\*\*/g, "<b>$1</b>") // Bold text
        .replace(/\*(.*?)\*/g, "<i>$1</i>") // Italic text
        .replace(/\n/g, "<br>") // New line to <br>
        .trim() || "Sorry, I couldn't understand that.";
    
        conversationHistory.push({role:"bot",text:botMessage});
        // Update bot message in UI
        messageElement.innerHTML = botMessage; // Use innerHTML for formatted text
    } catch (error) {
        console.error(error);
        messageElement.innerText = `Error: ${error.message}`;
        incomingMessageDiv.classList.add("error");
    } finally {
        userData.file = { data: null, mime_type: null };
        incomingMessageDiv.classList.remove("thinking");
        chatBody.scrollTo({ top: chatBody.scrollHeight, behavior: "smooth" });
    }
};

// Handle user message
const handleOutgoingMessage = (e) => {
    e.preventDefault();
    const userMessage = messageInput.value.trim();
    if (!userMessage) return;

    fileUploadWrapper.classList.remove("file-uploaded"); 
    userData.message = userMessage; 

    if(!userData.file.data){
        const lastImageMessage=[...conversationHistory].reverse().find(message => message.file && message.file.data);

        if(lastImageMessage){
            userData.file=lastImageMessage.file;
        }else if(lastUploadFile){
        userData.file=lastUploadFile;
        lastUploadFile=null;
        }
    }

    conversationHistory.push({role:"user",text:userMessage,file:userData.file});

    const messageContent = `
        <div class="message-text">${userData.message}</div>
        ${userData.file.data ? `<img src="data:${userData.file.mime_type};base64,${userData.file.data}" class="attachment"/>` : ""}
    `;

    const outgoingMessageDiv = createMessageElement(messageContent, "user-message");
    chatBody.appendChild(outgoingMessageDiv);
    messageInput.value = ""; 
    chatBody.scrollTo({ top: chatBody.scrollHeight, behavior: "smooth" });

    // Show bot thinking animation
    setTimeout(() => {
        const thinkingMessageContent = `
            <svg class="bot-avatar" xmlns="http://www.w3.org/2000/svg" width="50" height="50" viewBox="0 0 1024 1024">
                <path d="M738.3 287.6H285.7c-59 0-106.8 47.8-106.8 106.8v303.1c0 59 47.8 106.8 106.8 106.8h81.5v111.1c0 .7.8 1.1 1.4.7l166.9-110.6 41.8-.8h117.4l43.6-.4c59 0 106.8-47.8 106.8-106.8V394.5c0-59-47.8-106.9-106.8-106.9zM351.7 448.2c0-29.5 23.9-53.5 53.5-53.5s53.5 23.9 53.5 53.5-23.9 53.5-53.5 53.5-53.5-23.9-53.5-53.5zm157.9 267.1c-67.8 0-123.8-47.5-132.3-109h264.6c-8.6 61.5-64.5 109-132.3 109zm110-213.7c-29.5 0-53.5-23.9-53.5-53.5s23.9-53.5 53.5-53.5 53.5 23.9 53.5 53.5-23.9 53.5-53.5 53.5z"></path>
            </svg>
            <div class="message-text">
                <div class="thinking-indicator">
                    <div class="dot"></div>
                    <div class="dot"></div>
                    <div class="dot"></div>
                </div>
            </div>`;
        const incomingMessageDiv = createMessageElement(thinkingMessageContent, "bot-message", "thinking");
        chatBody.appendChild(incomingMessageDiv);
        chatBody.scrollTo({ top: chatBody.scrollHeight, behavior: "smooth" });

        generateBotResponse(incomingMessageDiv);
    }, 600);
};

// Handle "Enter" key event
messageInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") handleOutgoingMessage(e);
});

// Handle file selection
fileInput.addEventListener("change", () => {
    const file = fileInput.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        fileUploadWrapper.querySelector("img").src = e.target.result;
        fileUploadWrapper.classList.add("file-uploaded");

        lastUploadFile = {
            data: e.target.result.split(",")[1],
            mime_type: file.type
        };
        fileInput.value = "";
    };
    reader.readAsDataURL(file);
});

// Handle file cancel
fileCancelButton.addEventListener("click", () => {
    userData.file = { data: null, mime_type: null };
    fileUploadWrapper.classList.remove("file-uploaded");
});

// Initialize Emoji Picker
const picker = new EmojiMart.Picker({
    theme: "light",
    skinTonePosition: "none",
    previewPosition: "none",
    onEmojiSelect: (emoji) => {
        const { selectionStart, selectionEnd } = messageInput;
        messageInput.setRangeText(emoji.native, selectionStart, selectionEnd, "end");
        messageInput.focus();
    }
});

// Append picker only if chat form exists
const chatForm = document.querySelector(".chat-form");
if (chatForm) chatForm.appendChild(picker);

// Toggle emoji picker visibility
document.querySelector("#emoji-picker").addEventListener("click", (e) => {
    document.body.classList.toggle("show-emoji-picker");
    e.stopPropagation();
});

// Close emoji picker on outside click
document.addEventListener("click", (e) => {
    if (!e.target.closest(".emoji-mart")) {
        document.body.classList.remove("show-emoji-picker");
    }
});

// Handle send button click
sendMessageButton.addEventListener("click", handleOutgoingMessage);

// Handle file upload button click
document.querySelector("#file-upload").addEventListener("click", () => fileInput.click());

