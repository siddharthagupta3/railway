// 1. App State / Init
// ---------- DOM Helpers ----------
const qs = (selector, root = document) => root.querySelector(selector);
const qsa = (selector, root = document) => Array.from(root.querySelectorAll(selector));
const byId = (id) => document.getElementById(id);

// ---------- Config ----------
const TYPING_TEXT = 'Finance system ';
const TYPING_SPEED = 70;
const TYPING_PAUSE = 1110;

// ---------- Landing UI State ----------
const landingState = {
  typingIndex: 0,
  deleting: false,
  autoScrollTimer: null
};

// ---------- Chatbot Response Map ----------
const replies = {
  hello: 'Hello 👋 Finance Management System mein aapka welcome hai!',
  hi: 'Hi 🚀 How can I help with your finances?',
  portfolio: 'Portfolio management dashboard se manage karein.',
  investment: 'Investment tracking tools available hain.',
  returns: 'Returns analytics real-time dikhega.',
  risk: 'Risk analysis aapke liye calculate karega.',
  finance: 'Ye Finance Management System hai.',
  account: 'Account details dashboard mein visible hain.',
  balance: 'Balance check account section se karein.',
  transaction: 'Transaction history available hai.',
  transfer: 'Transfer option banking section mein hai.',
  payment: 'Payment options available hain.',
  loan: 'Loan details finance section mein milenge.',
  credit: 'Credit score profile mein dikhega.',
  debit: 'Debit details transaction history mein hai.',
  savings: 'Savings goals set karein dashboard se.',
  'investment plan': 'Investment planning tools available hain.',
  analytics: 'Analytics reports real-time generate hote hain.',
  report: 'Reports download ke liye ready hain.',
  budget: 'Budget planning feature available hai.',
  expense: 'Expense tracking automated hai.',
  income: 'Income management easy hai.',
  tax: 'Tax calculation automatic hota hai.',
  support: 'Support team 24/7 available hai.',
  help: 'Help section mein guidance milegi.',
  contact: 'Contact us page se reach out karein.',
  thanks: 'Welcome! 😊',
  bye: 'Bye! 👋 Good luck with finances!',
  'what is finance': 'Finance management system for portfolio handling.',
  'your name': "I'm Finance AI Assistant 🤖",
  'who made you': 'Developed by Siddhartha Gupta 👨‍💻',
  'how to start': 'Dashboard se start karein.',
  features: 'Analytics, Reports, Tracking - sab available hai.',
  security: '256-bit encryption secure hai.',
  privacy: 'Privacy policy available hai.',
  terms: 'Terms & conditions accept karein.',
  cost: 'Pricing page check karein details ke liye.',
  'free trial': 'Free trial 30 days available hai.',
  subscription: 'Subscription plans ke liye pricing dekhen.',
  'mobile app': 'Mobile app soon launch hoga.',
  api: 'API documentation available hai.',
  integration: 'Third-party integration support hai.',
  export: 'Export reports in PDF/Excel format.',
  dashboard: 'Dashboard ke through sab kuch manage karein.',
  widget: 'Widgets customize karke use karein.',
  notification: 'Notifications real-time milenge.',
  alert: 'Alerts important updates ke liye hain.',
  default: [
    'Aap mujhse finance related kuch bhi puch sakte hain 😊',
    'Portfolio, investment ya transaction ke baare mein poochiye.',
    'Finance management ke features puchiye.',
    'Main aapki financial planning mein madad kar sakta hoon.',
    'Dashboard explore karke dekhiye features.',
    'Kya aapko analytics report chahiye?',
    'Investment tracking mein help chahiye?',
    'Budget planning start karna chahte hain?',
    'Main humesha aapki madad ke liye ready hoon 🚀'
  ]
};

// 2. UI Rendering (dashboard, cards, transactions)
// ---------- Layout Rendering ----------
function hideLoader() {
  const loader = byId('loader');
  if (loader) loader.style.display = 'none';
}

function updateScrollProgress() {
  const progress = byId('scrollProgress');
  if (!progress) return;

  const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
  const scrollPercent = maxScroll > 0 ? (window.scrollY / maxScroll) * 100 : 0;
  progress.style.width = `${scrollPercent}%`;
}

function updateNavbarState() {
  const navbar = byId('navbar');
  if (!navbar) return;
  navbar.classList.toggle('scrolled', window.scrollY > 50);
}

function setFooterYear() {
  const footerYear = qs('.footer-bottom p');
  if (footerYear) {
    footerYear.textContent = `© ${new Date().getFullYear()} Finance. All rights reserved.`;
  }
}

// ---------- Navigation Rendering ----------
function initSmoothScroll() {
  qsa('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener('click', (event) => {
      event.preventDefault();
      const target = qs(anchor.getAttribute('href'));
      if (target) {
        target.scrollIntoView({ behavior: 'auto' });
      }
    });
  });
}

function toggleMobileMenu() {
  const navLinks = qs('.nav-links');
  if (!navLinks) return;

  const isOpen = navLinks.style.display === 'flex';
  navLinks.style.display = isOpen ? 'none' : 'flex';
  navLinks.style.position = 'absolute';
  navLinks.style.top = '100%';
  navLinks.style.left = '0';
  navLinks.style.right = '0';
  navLinks.style.flexDirection = 'column';
  navLinks.style.background = 'rgba(10, 10, 15, 0.95)';
  navLinks.style.padding = '1rem';
  navLinks.style.borderTop = '1px solid var(--glass-border)';
}

// ---------- Access Flow Rendering ----------
function startFlowAutoScroll(track) {
  if (landingState.autoScrollTimer) return;

  landingState.autoScrollTimer = setInterval(() => {
    const maxScroll = track.scrollWidth - track.clientWidth;
    const card = qs('.flow-card', track);
    const step = card ? card.getBoundingClientRect().width + 24 : 320;

    if (track.scrollLeft >= maxScroll - 5) {
      track.scrollTo({ left: 0, behavior: 'smooth' });
    } else {
      track.scrollBy({ left: step, behavior: 'smooth' });
    }
  }, 2400);
}

function stopFlowAutoScroll() {
  if (!landingState.autoScrollTimer) return;
  clearInterval(landingState.autoScrollTimer);
  landingState.autoScrollTimer = null;
}

function initFlowAutoScroll() {
  const track = qs('.flow-track');
  if (!track) return;

  const isMobile = window.matchMedia('(max-width: 768px)').matches;
  if (!isMobile) return;

  track.addEventListener('touchstart', stopFlowAutoScroll, { passive: true });
  track.addEventListener('touchend', () => startFlowAutoScroll(track), { passive: true });
  startFlowAutoScroll(track);
}

// ---------- Toast Rendering ----------
function showToast(message) {
  const toast = byId('toast');
  const toastMessage = byId('toastMessage');
  if (!toast || !toastMessage) return;

  toastMessage.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3000);
}

// ---------- Chat Rendering ----------
function getTime() {
  const now = new Date();
  return `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`;
}

function scrollBottom() {
  const body = byId('chatBody');
  if (body) body.scrollTop = body.scrollHeight;
}

function addUserMessage(text) {
  const body = byId('chatBody');
  if (!body) return;

  const msg = document.createElement('div');
  msg.className = 'msg user';
  msg.append(document.createTextNode(text));

  const time = document.createElement('div');
  time.className = 'time';
  time.append(document.createTextNode(getTime()));

  const tick = document.createElement('span');
  tick.className = 'tick';
  tick.textContent = '✔✔';
  time.append(tick);

  msg.append(time);
  body.appendChild(msg);
  scrollBottom();

  setTimeout(() => {
    const tickEl = msg.querySelector('.tick');
    if (tickEl) tickEl.style.color = 'skyblue';
  }, 1000);
}

function addBotMessage(text) {
  const body = byId('chatBody');
  if (!body) return;

  const msg = document.createElement('div');
  msg.className = 'msg bot';
  msg.append(document.createTextNode(text));

  const time = document.createElement('div');
  time.className = 'time';
  time.textContent = getTime();
  msg.append(time);

  body.appendChild(msg);
  scrollBottom();
}

function getReply(text) {
  const normalized = text.toLowerCase();
  const matchedKey = Object.keys(replies).find((key) => key !== 'default' && normalized.includes(key));
  if (matchedKey) return replies[matchedKey];

  const fallback = replies.default;
  return fallback[Math.floor(Math.random() * fallback.length)];
}

function sendMessage() {
  const input = byId('chatInput');
  if (!input) return;

  const text = input.value.trim();
  if (!text) return;

  addUserMessage(text);
  input.value = '';
  setTimeout(() => addBotMessage(getReply(text)), 800);
}

function toggleChat() {
  const box = byId('chatBox');
  if (!box) return;

  box.style.display = box.style.display === 'flex' ? 'none' : 'flex';
  if (box.style.display === 'flex' && !localStorage.getItem('greeted')) {
    addBotMessage('Hello 👋 Welcome to Finance AI Assistant!');
    localStorage.setItem('greeted', 'yes');
  }
}

function clearChat() {
  const body = byId('chatBody');
  if (body) body.innerHTML = '';
}

function startVoice() {
  if (!('webkitSpeechRecognition' in window)) {
    alert('Voice not supported in this browser');
    return;
  }

  const recognition = new webkitSpeechRecognition();
  recognition.lang = 'en-IN';
  recognition.start();
  recognition.onresult = (event) => {
    const input = byId('chatInput');
    if (input) input.value = event.results[0][0].transcript;
    sendMessage();
  };
}

function initChatInputHandler() {
  const chatInput = byId('chatInput');
  if (!chatInput) return;

  chatInput.addEventListener('keypress', (event) => {
    if (event.key === 'Enter') sendMessage();
  });
}

function initPageActionBindings() {
  byId('mobileMenuToggle')?.addEventListener('click', toggleMobileMenu);
  byId('watchDemoBtn')?.addEventListener('click', () => showToast('Playing demo video'));
  byId('chatToggle')?.addEventListener('click', toggleChat);
  byId('chatClear')?.addEventListener('click', clearChat);
  byId('chatClose')?.addEventListener('click', toggleChat);
  byId('chatVoiceBtn')?.addEventListener('click', startVoice);
  byId('chatSendBtn')?.addEventListener('click', sendMessage);
}

// ---------- Stats Rendering ----------
function renderStaticStats() {
  const statsSection = qs('.stats');
  if (!statsSection) return;

  statsSection.querySelectorAll('[data-target]').forEach((counter) => {
    const target = parseFloat(counter.getAttribute('data-target'));
    counter.textContent = `${target}${counter.textContent.includes('%') ? '%' : '+'}`;
  });
}

// 3. Event Handlers (buttons, forms, search, filter)
// ---------- Event Handling ----------
function handleScroll() {
  updateScrollProgress();
  updateNavbarState();
}

function initLandingPage() {
  setFooterYear();
  initSmoothScroll();
  initFlowAutoScroll();
  initChatInputHandler();
  initPageActionBindings();
  renderStaticStats();
  runTypingEffect();
}

window.addEventListener('load', hideLoader);
window.addEventListener('scroll', handleScroll);
document.addEventListener('DOMContentLoaded', initLandingPage);

// 4. Business Logic (calculations, insights)
// ---------- Chat Reply Logic ----------
// getReply keeps keyword-based response selection for assistant behavior.

// 5. Charts (monthly, category)
// ---------- Not used on this page ----------

// 6. Utility functions
// ---------- Helpers are defined at top (qs, qsa, byId, getTime) ----------

// 7. Animations (last me)
// ---------- Animation Logic ----------
function runTypingEffect() {
  const el = byId('typing-text');
  if (!el) return;

  if (!landingState.deleting) {
    el.innerHTML = TYPING_TEXT.substring(0, landingState.typingIndex);
    landingState.typingIndex += 1;

    if (landingState.typingIndex > TYPING_TEXT.length) {
      landingState.deleting = true;
      setTimeout(runTypingEffect, TYPING_PAUSE);
      return;
    }
  } else {
    el.innerHTML = TYPING_TEXT.substring(0, landingState.typingIndex);
    landingState.typingIndex -= 1;

    if (landingState.typingIndex < 0) {
      landingState.deleting = false;
    }
  }

  setTimeout(runTypingEffect, TYPING_SPEED);
}

// ---------- GLOBAL API (USED BY INLINE HTML ATTRIBUTES) ----------
window.toggleMobileMenu = toggleMobileMenu;
window.showToast = showToast;
window.toggleChat = toggleChat;
window.clearChat = clearChat;
window.sendMessage = sendMessage;
window.startVoice = startVoice;
