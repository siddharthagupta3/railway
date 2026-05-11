// ================= ELEMENTS =================
const input = document.getElementById("input");
const chat = document.getElementById("chat");
const menuBtn = document.querySelector(".menu-btn");
const sidebar = document.querySelector(".sidebar");
const newChatBtn = document.querySelector(".new-chat");
const chatHistory = document.getElementById("chatHistory");
const imageInput = document.getElementById("imageInput");
const attachBtn = document.querySelector(".attach");
const micBtn = document.querySelector(".mic");

// ================= SPEECH RECOGNITION =================
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = null;
let isListening = false;

if(SpeechRecognition){
  recognition = new SpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.language = 'en-US';
  
  recognition.onstart = () => {
    isListening = true;
    if(micBtn) micBtn.style.background = 'rgba(255, 100, 100, 0.3)';
  };
  
  recognition.onresult = (event) => {
    let transcript = '';
    for(let i = event.resultIndex; i < event.results.length; i++){
      transcript += event.results[i][0].transcript;
    }
    if(transcript) input.value = transcript + " ";
    input.focus();
  };
  
  recognition.onerror = () => {
    isListening = false;
    if(micBtn) micBtn.style.background = '';
  };
  
  recognition.onend = () => {
    isListening = false;
    if(micBtn) micBtn.style.background = '';
  };
}

// ================= CHAT STORAGE =================
const CHAT_STORAGE_KEY = "railwayOpsAssistantChats";
const CHAT_ID_KEY = "railwayOpsAssistantChatId";
let chats = JSON.parse(localStorage.getItem(CHAT_STORAGE_KEY)) || [];
let currentChatId = localStorage.getItem(CHAT_ID_KEY) || null;

const preloadMessages = [
  "Welcome to Railway Operations Assistant. I can help with assets, inspections, and reports.",
  "Try: 'Show damaged assets by zone' or 'Create an inspection checklist'.",
  "Add asset IDs or track sections for precise answers."
];

// ================= INITIALIZE =================
function initializeApp(){
  displayChatHistory();
  if(!currentChatId && chats.length > 0){
    loadChat(chats[chats.length - 1].id);
  }
  if(!currentChatId && chats.length === 0){
    createNewChat({ seedMessages: preloadMessages });
  }
  setupEventListeners();
}

// ================= SETUP EVENT LISTENERS =================
function setupEventListeners(){
  // Enter key
  if(input){
    input.addEventListener("keypress", function(e){
      if(e.key === "Enter"){
        sendMessage();
      }
    });
  }

  // Hamburger menu
  if(menuBtn && sidebar){
    menuBtn.addEventListener("click", ()=>{
      sidebar.classList.toggle("active");
    });
  }

  // Sidebar close button
  const sidebarCloseBtn = document.querySelector(".sidebar-close-btn");
  if(sidebarCloseBtn && sidebar){
    sidebarCloseBtn.addEventListener("click", ()=>{
      sidebar.classList.remove("active");
    });
  }

  // New chat button
  if(newChatBtn){
    newChatBtn.addEventListener("click", ()=>{
      createNewChat();
    });
  }

  // Clear all chats button
  const clearAllBtn = document.querySelector(".clear-all-btn");
  if(clearAllBtn){
    clearAllBtn.addEventListener("click", ()=>{
      if(confirm("Delete all chats? This cannot be undone.")){
        chats = [];
        localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(chats));
        currentChatId = null;
        localStorage.setItem(CHAT_ID_KEY, currentChatId);
        displayChatHistory();
        clearChatUI();
      }
    });
  }

  // Delete button (trash icon) - first icon-btn
  const deleteBtn = document.getElementById("clearChatBtn");
  if(deleteBtn){
    deleteBtn.addEventListener("click", ()=>{
      if(confirm("Clear current chat?")){
        const currentChat = chats.find(c => c.id === currentChatId);
        if(currentChat){
          currentChat.messages = [];
          localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(chats));
        }
        clearChatUI();
      }
    });
  }

  // Settings button (gear icon) in sidebar
  const settingsBtn = document.querySelector(".sidebar-settings-btn");
  if(settingsBtn){
    settingsBtn.addEventListener("click", ()=>{
      window.location.href = "../setting/setting.html";
    });
  }

  // Profile button (U div)
  const profileBtn = document.querySelector(".profile");
  if(profileBtn){
    profileBtn.addEventListener("click", ()=>{
      input.focus();
    });
  }

  // Quick prompt chips
  document.querySelectorAll(".prompt-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      const prompt = chip.dataset.prompt || chip.textContent || "";
      if(prompt){
        input.value = prompt;
        sendMessage();
      }
    });
  });

  // Attach button - open file input
  if(attachBtn && imageInput){
    attachBtn.addEventListener("click", ()=>{
      imageInput.click();
    });
  }

  // Microphone button
  if(micBtn && recognition){
    micBtn.addEventListener("click", ()=>{
      if(isListening){
        recognition.stop();
        isListening = false;
        micBtn.style.background = '';
      } else {
        recognition.start();
      }
    });
  }

  // Image input change - handle image selection
  if(imageInput){
    imageInput.addEventListener("change", (e)=>{
      const file = e.target.files[0];
      if(file){
        const reader = new FileReader();
        reader.onload = (event) => {
          uploadImage(event.target.result, file.name);
        };
        reader.readAsDataURL(file);
        imageInput.value = "";
      }
    });
  }

  // Close dropdowns when clicking outside
  document.addEventListener("click", (e)=>{
    if(!e.target.closest(".chat-item-menu") && !e.target.closest(".chat-item-menu-dropdown")){
      document.querySelectorAll(".chat-item-menu-dropdown").forEach(d => {
        d.classList.remove("show");
      });
    }
  });
}

function formatTime(date = new Date()){
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}

function addMessageToUI(role, text, meta = {}){
  const msgDiv = document.createElement("div");
  msgDiv.className = `message ${role}`;

  const msgContent = document.createElement("div");
  msgContent.className = "msg-content";

  if(meta.image){
    const img = document.createElement("img");
    img.src = meta.image;
    img.title = meta.imageTitle || "attachment";
    msgContent.appendChild(img);
  } else {
    msgContent.textContent = text;
  }

  const metaLine = document.createElement("div");
  metaLine.className = "msg-meta";
  metaLine.textContent = meta.time || formatTime();

  msgDiv.appendChild(msgContent);
  msgDiv.appendChild(metaLine);
  chat.appendChild(msgDiv);
}

function addMessageToStore(role, text, meta = {}){
  const currentChat = chats.find(c => c.id === currentChatId);
  if(!currentChat) return;
  currentChat.messages.push({ role, text, image: meta.image || null, time: meta.time || formatTime() });
  localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(chats));
}

function generateReply(prompt){
  const text = prompt.toLowerCase();
  const intents = [
    { keys: ["hello", "hi", "hey"], reply: "Hello. How can I assist with railway operations today?" },
    { keys: ["asset", "assets"], reply: "I can list assets by zone, status, or type. Share a zone or asset ID." },
    { keys: ["inspection", "checklist"], reply: "Inspection checklist: verify QR, check torque, record wear, log date and inspector." },
    { keys: ["damaged", "issue"], reply: "For damaged assets: isolate section, log severity, schedule replacement, notify maintenance." },
    { keys: ["qr", "scan"], reply: "To scan: open the asset scanner, align QR, confirm asset ID, then log inspection." },
    { keys: ["report", "export"], reply: "I can draft a maintenance report summary. Provide dates and zones to include." },
    { keys: ["status", "delay"], reply: "Status checks: review active assets, pending inspections, and alerts for each corridor." },
    { keys: ["safety"], reply: "Safety reminder: flag worn components, track replacement history, and keep inspection cadence." },
  ];

  const match = intents.find(intent => intent.keys.some(k => text.includes(k)));
  if(match) return match.reply;

  return "Noted. Share more details (zone, track section, or asset ID) for a precise answer.";
}

// ================= SEND MESSAGE =================
function sendMessage(){
  const text = input.value.trim();
  if(text === "") return;

  if(!currentChatId){
    createNewChat({ seedMessages: preloadMessages });
  }

  addMessageToUI("user", text);
  addMessageToStore("user", text);
  input.value = "";
  scrollBottom();
  botTyping(text);
}

// ================= UPLOAD IMAGE =================
function uploadImage(imageData, fileName){
  if(!currentChatId){
    createNewChat({ seedMessages: preloadMessages });
  }

  addMessageToUI("user", "", { image: imageData, imageTitle: fileName });
  addMessageToStore("user", `Image: ${fileName}`, { image: imageData });
  scrollBottom();

  const reply = "Image received. Share the asset ID so I can log inspection notes.";
  botTyping(reply, true);
}

// ================= BOT TYPING (REAL API) =================
function botTyping(prompt, directReply = false){
  const botMsg = document.createElement("div");
  botMsg.className = "message bot";

  const botContent = document.createElement("div");
  botContent.className = "msg-content";
  botContent.textContent = "...";

  const metaLine = document.createElement("div");
  metaLine.className = "msg-meta";
  metaLine.textContent = formatTime();

  botMsg.appendChild(botContent);
  botMsg.appendChild(metaLine);
  chat.appendChild(botMsg);

  scrollBottom();

  const reply = directReply ? prompt : generateReply(prompt);
  setTimeout(() => {
    typeEffect(botContent, reply);
    addMessageToStore("bot", reply);
  }, 550);
}

// ================= TYPE EFFECT =================
function typeEffect(element, text){
  element.innerHTML = "";
  let i = 0;

  function typing(){
    if(i < text.length){
      element.innerHTML += text.charAt(i);
      i++;
      setTimeout(typing, 20);
      scrollBottom();
    }
  }
  typing();
}

// ================= AUTO SCROLL =================
function scrollBottom(){
  chat.scrollTop = chat.scrollHeight;
}

// ================= CREATE NEW CHAT =================
function createNewChat(options = {}){
  const chatId = "chat_" + Date.now();
  const chatNumber = chats.length + 1;
  const newChat = {
    id: chatId,
    name: "Chat " + chatNumber,
    messages: [],
    createdAt: new Date()
  };
  
  chats.push(newChat);
  localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(chats));
  currentChatId = chatId;
  localStorage.setItem(CHAT_ID_KEY, currentChatId);
  
  displayChatHistory();
  clearChatUI();
  if(sidebar){
    sidebar.classList.remove("active");
  }

  if(Array.isArray(options.seedMessages)){
    options.seedMessages.forEach((text) => {
      addMessageToUI("bot", text);
      addMessageToStore("bot", text);
    });
  }
}

// ================= LOAD CHAT =================
function loadChat(chatId){
  currentChatId = chatId;
  localStorage.setItem(CHAT_ID_KEY, currentChatId);
  displayChatHistory();
  renderChatMessages();
}

// ================= TOGGLE MENU DROPDOWN =================
function toggleChatMenu(chatId, event){
  event.stopPropagation();
  const dropdown = event.currentTarget.nextElementSibling;
  
  // Close other dropdowns
  document.querySelectorAll(".chat-item-menu-dropdown").forEach(d => {
    if(d !== dropdown) d.classList.remove("show");
  });
  
  dropdown.classList.toggle("show");
}

// ================= DELETE SPECIFIC CHAT =================
function deleteChat(chatId, event){
  event.stopPropagation();
  if(confirm("Delete this chat?")){
    chats = chats.filter(c => c.id !== chatId);
    localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(chats));
    
    if(currentChatId === chatId){
      currentChatId = chats.length > 0 ? chats[chats.length - 1].id : null;
      localStorage.setItem(CHAT_ID_KEY, currentChatId);
    }
    
    displayChatHistory();
    if(currentChatId){
      renderChatMessages();
    } else {
      clearChatUI();
    }
  }
}

// ================= RENDER CHAT MESSAGES =================
function renderChatMessages(){
  clearChatUI();
  let currentChat = chats.find(c => c.id === currentChatId);
  if(currentChat && currentChat.messages.length > 0){
    currentChat.messages.forEach(msg => {
      addMessageToUI(msg.role, msg.text, { image: msg.image || null, time: msg.time });
    });
    scrollBottom();
  }
}

// ================= CLEAR CHAT UI =================
function clearChatUI(){
  chat.innerHTML = '';
}

// ================= DISPLAY CHAT HISTORY =================
function displayChatHistory(){
  chatHistory.innerHTML = "";
  chats.forEach(c => {
    const chatItem = document.createElement("div");
    chatItem.className = "chat-item";
    if(c.id === currentChatId) chatItem.classList.add("active");
    
    // Chat name
    const chatName = document.createElement("span");
    chatName.className = "chat-item-name";
    chatName.innerText = c.name;
    chatName.addEventListener("click", () => {
      loadChat(c.id);
      sidebar.classList.remove("active");
    });
    
    // Delete button (X) - directly visible on right side
    const deleteBtn = document.createElement("button");
    deleteBtn.className = "chat-item-delete-btn";
    deleteBtn.innerText = "x";
    deleteBtn.title = "Delete chat";
    deleteBtn.addEventListener("click", (e) => deleteChat(c.id, e));
    
    chatItem.appendChild(chatName);
    chatItem.appendChild(deleteBtn);
    chatHistory.appendChild(chatItem);
  });
}

// ================= INITIALIZE ON LOAD =================
document.addEventListener("DOMContentLoaded", initializeApp);

