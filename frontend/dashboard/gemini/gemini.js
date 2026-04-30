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
let chats = JSON.parse(localStorage.getItem("geminiChats")) || [];
let currentChatId = localStorage.getItem("currentChatId") || null;

// ================= INITIALIZE =================
function initializeApp(){
  displayChatHistory();
  if(!currentChatId && chats.length > 0){
    loadChat(chats[chats.length - 1].id);
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
        localStorage.setItem("geminiChats", JSON.stringify(chats));
        currentChatId = null;
        localStorage.setItem("currentChatId", currentChatId);
        displayChatHistory();
        clearChatUI();
      }
    });
  }

  // Delete button (trash icon) - first icon-btn
  const deleteBtn = document.querySelectorAll(".icon-btn")[0];
  if(deleteBtn){
    deleteBtn.addEventListener("click", ()=>{
      if(confirm("Are you sure you want to delete this chat?")){
        chats = chats.filter(c => c.id !== currentChatId);
        localStorage.setItem("geminiChats", JSON.stringify(chats));
        currentChatId = chats.length > 0 ? chats[chats.length - 1].id : null;
        localStorage.setItem("currentChatId", currentChatId);
        displayChatHistory();
        clearChatUI();
      }
    });
  }

  // Settings button (gear icon) in sidebar
  const settingsBtn = document.querySelector(".sidebar-settings-btn");
  if(settingsBtn){
    settingsBtn.addEventListener("click", ()=>{
      window.location.href = "../settings/settings.html";
    });
  }

  // Profile button (U div)
  const profileBtn = document.querySelector(".profile");
  if(profileBtn){
    profileBtn.addEventListener("click", ()=>{
      window.location.href = "../profile/profile.html";
    });
  }

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

// ================= SEND MESSAGE =================
function sendMessage(){
  let text = input.value.trim();
  if(text === "") return;

  if(!currentChatId){
    createNewChat();
  }

  const userMsg = document.createElement("div");
  userMsg.className = "message user";

  const userContent = document.createElement("div");
  userContent.className = "msg-content";
  userContent.innerText = text;

  userMsg.appendChild(userContent);
  chat.appendChild(userMsg);

  input.value = "";
  scrollBottom();

  let currentChat = chats.find(c => c.id === currentChatId);
  if(currentChat){
    currentChat.messages.push({ role: "user", text: text });
  }

  botTyping();
}

// ================= UPLOAD IMAGE =================
function uploadImage(imageData, fileName){
  if(!currentChatId){
    createNewChat();
  }

  const userMsg = document.createElement("div");
  userMsg.className = "message user";

  const userContent = document.createElement("div");
  userContent.className = "msg-content";
  
  const img = document.createElement("img");
  img.src = imageData;
  img.style.maxWidth = "200px";
  img.style.borderRadius = "10px";
  img.style.marginTop = "5px";
  img.title = fileName;

  userContent.appendChild(img);
  userMsg.appendChild(userContent);
  chat.appendChild(userMsg);

  scrollBottom();

  let currentChat = chats.find(c => c.id === currentChatId);
  if(currentChat){
    currentChat.messages.push({ role: "user", text: "📷 Image: " + fileName, image: imageData });
  }

  botTyping();
}

// ================= BOT TYPING (REAL API) =================
async function botTyping(){
  const botMsg = document.createElement("div");
  botMsg.className = "message bot";

  const botContent = document.createElement("div");
  botContent.className = "msg-content";
  botContent.innerHTML = "<span class='dots'>. . .</span>";

  botMsg.appendChild(botContent);
  chat.appendChild(botMsg);

  scrollBottom();

  try {
    let currentChat = chats.find(c => c.id === currentChatId);
    if (!currentChat) return;

    // Get last message as prompt
    const prompt = currentChat.messages[currentChat.messages.length - 1].text;
    // History (excluding the very last message we just sent as prompt)
    const history = currentChat.messages.slice(0, -1);

    const res = await window.apiRequest('/gemini/chat', {
      method: 'POST',
      body: JSON.stringify({ prompt, history })
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      throw new Error(data.message || 'AI error');
    }

    const reply = data.text;
    typeEffect(botContent, reply);
    
    currentChat.messages.push({ role: "bot", text: reply });
    localStorage.setItem("geminiChats", JSON.stringify(chats));

  } catch (error) {
    botContent.innerHTML = "<span style='color: #ef4444;'>❌ Error: " + error.message + "</span>";
    console.error('Gemini API Error:', error);
  }
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
function createNewChat(){
  const chatId = "chat_" + Date.now();
  const chatNumber = chats.length + 1;
  const newChat = {
    id: chatId,
    name: "Chat " + chatNumber,
    messages: [],
    createdAt: new Date()
  };
  
  chats.push(newChat);
  localStorage.setItem("geminiChats", JSON.stringify(chats));
  currentChatId = chatId;
  localStorage.setItem("currentChatId", currentChatId);
  
  displayChatHistory();
  clearChatUI();
  if(sidebar){
    sidebar.classList.remove("active");
  }
}

// ================= LOAD CHAT =================
function loadChat(chatId){
  currentChatId = chatId;
  localStorage.setItem("currentChatId", currentChatId);
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
    localStorage.setItem("geminiChats", JSON.stringify(chats));
    
    if(currentChatId === chatId){
      currentChatId = chats.length > 0 ? chats[chats.length - 1].id : null;
      localStorage.setItem("currentChatId", currentChatId);
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
      const msgDiv = document.createElement("div");
      msgDiv.className = "message " + msg.role;
      
      const msgContent = document.createElement("div");
      msgContent.className = "msg-content";
      
      if(msg.image){
        const img = document.createElement("img");
        img.src = msg.image;
        img.style.maxWidth = "200px";
        img.style.borderRadius = "10px";
        img.title = msg.text;
        msgContent.appendChild(img);
      } else {
        msgContent.innerText = msg.text;
      }
      
      msgDiv.appendChild(msgContent);
      chat.appendChild(msgDiv);
    });
    scrollBottom();
  }
}

// ================= CLEAR CHAT UI =================
function clearChatUI(){
  chat.innerHTML = '<div class="message bot"><div class="msg-content">Hello ?? I am Gemini AI. How can I help you?</div></div>';
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
    deleteBtn.innerText = "✕";
    deleteBtn.title = "Delete chat";
    deleteBtn.addEventListener("click", (e) => deleteChat(c.id, e));
    
    chatItem.appendChild(chatName);
    chatItem.appendChild(deleteBtn);
    chatHistory.appendChild(chatItem);
  });
}

// ================= INITIALIZE ON LOAD =================
document.addEventListener("DOMContentLoaded", initializeApp);

