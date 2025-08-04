const container = document.querySelector(".container");
const chatsContainer = document.querySelector(".chats-container");
const promptForm = document.querySelector(".prompt-form");
const promptInput = document.querySelector(".prompt-input");
const fileInput = document.querySelector("#file-input");
const fileUploadWrapper = document.querySelector(".file-upload-wrapper");
const filePreview = document.querySelector(".file-preview");
const fileNamePreview = document.querySelector(".file-name");
const cancelFileBtn = document.querySelector("#cancel-file-btn");
const themeToggleBtn = document.querySelector("#theme-toggle-btn");
const deleteChatsBtn = document.querySelector("#delete-chats-btn");
const stopResponseBtn = document.getElementById("stop-response-btn");

// API SETUP
const API_KEY = "AIzaSyAPsfrk0YK13EUNBJlxnDuSzvWDQ4V9X8I";
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`;


const chatHistory = [];
const userData = { message: "", file: {} };
let typingInterval, controller; // 🔥 Global typing interval
let typingDotsInterval; // 🔥 Global variable to control dots blinking

// Utility to create a message div
const createMsgElement = (content, ...classes) => {
  const div = document.createElement("div");
  div.classList.add("message", ...classes);
  div.innerHTML = content;
  return div;
};

// Theme toggle
document.addEventListener('DOMContentLoaded', () => {
  const themeToggleBtn = document.getElementById('theme-toggle-btn');

  themeToggleBtn.addEventListener('click', () => {
    document.body.classList.toggle('light-mode');

    // Optional: Toggle icon
    if (document.body.classList.contains('light-mode')) {
      themeToggleBtn.textContent = 'dark_mode';
    } else {
      themeToggleBtn.textContent = 'light_mode';
    }
  });
});

//Handle suggestions click
document.querySelectorAll(".suggestions-item").forEach(item => {
  item.addEventListener("click", () => {
    promptInput.value = item.querySelector(".text").textContent;
    promptForm.dispatchEvent(new Event("submit"));
  });
});


// Scroll to bottom
const scrollToBottom = () => {
  container.scrollTo({ top: container.scrollHeight, behavior: "auto" });
};

// Typing effect and stop button for bot reply
const typingEffect = (text, textElement, typingDiv) => {

  textElement.textContent = "";

  const words = text.split(" ");
  let wordIndex = 0

   typingInterval = setInterval(() => {
    if (wordIndex < words.length) {
      textElement.textContent += (wordIndex === 0 ? "" : " ") + words[wordIndex++];
      typingDiv.classList.remove("loading");
      scrollToBottom();
      
    } else {
      clearInterval(typingInterval);
      document.body.classList.remove("bot-responding");
      
    }
  }, 50);
};


// Simulate "Typing..." indicator

const showTypingIndicator = () => {
  const typingDiv = createMsgElement(`
  <div class="bot-message-content">
    <div class="bot-avatar-wrapper">
        <img src="13330989.png" class="bot-avatar" />
    </div>
    <div class="message-text">Thinking<span class="dot">.</span></div>
`, "bot-message", "loading");
  chatsContainer.appendChild(typingDiv);
  scrollToBottom();

  const dotSpan = typingDiv.querySelector(".dot");
  let dotCount = 1;

  typingDotsInterval = setInterval(() => {
    dotCount = (dotCount % 3) + 1;
    dotSpan.textContent = '.'.repeat(dotCount);
  }, 500); // cycle every 0.5 seconds

  return typingDiv;
};

//toggle sidebar chat history
const historyList = document.getElementById("history-list");
const toggleSidebarBtn = document.getElementById("toggle-sidebar-btn");

toggleSidebarBtn.addEventListener("click", () => {
  document.body.classList.toggle("sidebar-open");
});


const addToHistory = (userMsg, botMsg) => {
  const item = document.createElement("li");
  item.textContent = userMsg.slice(0, 50) + "...";
  item.title = botMsg;
  item.addEventListener("click", () => {
    alert(`User: ${userMsg}\n\nBot: ${botMsg}`);
  });
  historyList.appendChild(item);
};


// Generate Bot Response
const generateResponse = async (typingDiv) => {

  const textElement = typingDiv.querySelector(".message-text");
  controller = new AbortController();

  //add user message and file data to the chat history
  chatHistory.push({
    role: "user",
    parts: [
      { text: userData.message },
      ...(userData.file.data ? [{ inline_data: { data: userData.file.data, mime_type: userData.file.mime_type } }] : [])
    ]
  });

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: chatHistory }),
      signal: controller.signal
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error.message);

    const rawText = data.candidates[0].content.parts[0].text.trim();
    
    const responseText = data.candidates[0].content.parts[0].text.replace(/\*\*([^*]+)\*\*/g, "$1").trim();
    // line breaks

    // ✅ Add to history AFTER responseText is valid
    addToHistory(userData.message, responseText);

    
    //stop spinner animation
    typingDiv.classList.remove("loading");
    typingDiv.classList.remove("typing-indicator");
    typingEffect(responseText, textElement, typingDiv);

    chatHistory.push({ role: "model", parts: [{ text: responseText }] });

    console.log(chatHistory);

  } catch (error) {
    textElement.style.color = "#d62939";
    textElement.textContent = error.name === "AbortError" ? "Response generation stopped." : error.message;
    typingDiv.classList.remove("loading");
    document.body.classList.remove("bot-responding");
  } finally {
    userData.file = {};
  }
};

// Handle Prompt Submit
const handleFormSubmit = (e) => {
  e.preventDefault();
  const userMessage = promptInput.value.trim();
  if (!userMessage || document.body.classList.contains("bot-responding")) return;

  promptInput.value = "";
  userData.message = userMessage;
  document.body.classList.add("bot-responding", "chats-active");
  fileUploadWrapper.classList.remove("active", "img-attached", "file-attached");

  //generate user message html and add the chats container
  const userMsgHTML = `
    <p class="message-text"></p>
    ${userData.file.data ? (userData.file.isImage
      ? `<img src="data:${userData.file.mime_type};base64,${userData.file.data}" class="img-attachment" />`
      : `<p class="file-attachment"><span class="material-symbols-rounded">description</span>${userData.file.fileName}</p>`) : ""}
  `;
  
  const userMsgDiv = createMsgElement(userMsgHTML, "user-message");
  userMsgDiv.querySelector(".message-text").textContent = userMessage;
  chatsContainer.appendChild(userMsgDiv);
  scrollToBottom();

  // Bot Typing Indicator
  const typingDiv = showTypingIndicator();

  setTimeout(() => {
    chatsContainer.appendChild(typingDiv);
    generateResponse(typingDiv);
  }, 800);

  // Reset file upload
  fileUploadWrapper.classList.remove("active", "img-attached", "file-attached");
  filePreview.hidden = true;
  fileNamePreview.hidden = true;
  cancelFileBtn.hidden = true;
  userData.file = {};
};



// Delete chats
deleteChatsBtn.addEventListener("click", () => {
  chatsContainer.innerHTML = "";
});

// File Upload
fileInput.addEventListener("change", () => {
  const file = fileInput.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.readAsDataURL(file);

  reader.onload = (e) => {
    fileInput.value = "";

    const base64String = e.target.result.split(",")[1];

    //show preview and name
    filePreview.src = e.target.result;
    filePreview.hidden = false;
    fileNamePreview.textContent = file.name;
    fileNamePreview.hidden = false;
    fileUploadWrapper.classList.add("active");

    // --ADD pop-in classes when file is selected
    filePreview.classList.add("pop-in");
    fileNamePreview.classList.add("pop-in");

    cancelFileBtn.hidden = false;

    //store file data if needed
    userData.file = {
      fileName: file.name,
      data: base64String,
      mime_type: file.type,
      isImage: file.type.startsWith("image/")
    };
    //remove pop-in class after animation finishes, to avoid affecting future animations
    setTimeout(() => {
      filePreview.classList.remove("pop-in");
     fileNamePreview.classList.remove("pop-in");
    }, 300);
  };
});

// Cancel file upload
cancelFileBtn.addEventListener("click", () => {
  userData.file = {};
 

  // Add fade-out class
  filePreview.classList.add("fade-out");
  fileNamePreview.classList.add("fade-out");

  //after animation finishes (300ms) , hide and reset everything
  setTimeout(() => {

  fileUploadWrapper.classList.remove("active");

  filePreview.hidden = true;
  fileNamePreview.hidden = true;
  cancelFileBtn.hidden = true;

  filePreview.classList.remove("fade-out");
  fileNamePreview.classList.remove("fade-out");

  fileInput.value = "";
  userData.file = {};
  }, 300); //match the css transition time
});

// Stop ongoing bot response
document.querySelector("#stop-response-btn").addEventListener("click", () => {
  userData.file = {};
  controller?.abort();
  clearInterval(typingInterval);
  chatsContainer.querySelector("bot-message.loading").classList.remove("loading");
  document.body.classList.remove("bot-responding");
});

// Delete all chats
document.querySelector("#delete-chats-btn").addEventListener("click", () => {
  chatHistory.length = 0;
  chatsContainer.innerHTML = "";
  document.body.classList.remove("bot-responding", "chats-active");
});

 

// Click to trigger file input
document.querySelector("#add-file-btn").addEventListener("click", () => fileInput.click());

// Handle form submit
promptForm.addEventListener("submit", handleFormSubmit);
