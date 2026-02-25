const API_KEY = "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";

let chatHistory = [];

const chatContainer = document.getElementById("chat-container");
const userInput = document.getElementById("user-input");
const sendButton = document.getElementById("send-button");
const historyList = document.querySelector(".history");

async function sendMessage() {
  const text = userInput.value.trim();
  if (!text) return;

  appendMessage("user", text);
  userInput.value = "";

  sendButton.disabled = true;
  const loadingId = addLoadingIndicator();

  try {
    chatHistory.push({ role: "user", content: text });

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": window.location.href,
        "X-Title": "Mi Chat IA"
      },
      body: JSON.stringify({
        model: "openai/gpt-4o-mini",
        messages: chatHistory
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(JSON.stringify(data));
    }

    const aiText = data.choices[0].message.content;

    chatHistory.push({ role: "assistant", content: aiText });

    removeLoadingIndicator(loadingId);
    appendMessage("ai", aiText);
    updateSidebarHistory(text);

  } catch (error) {
    console.error("Error detallado:", error);
    removeLoadingIndicator(loadingId);
    appendMessage("ai", "❌ Error al conectar con OpenRouter.");
  } finally {
    sendButton.disabled = false;
    chatContainer.scrollTop = chatContainer.scrollHeight;
  }
}

function appendMessage(role, text) {
  const messageRow = document.createElement("div");
  messageRow.className = `message-row ${role}`;
  const avatar = role === "ai" ? "AG" : "U";

  messageRow.innerHTML = `
    <div class="message-avatar">${avatar}</div>
    <div class="message-bubble"></div>
  `;

  messageRow.querySelector(".message-bubble").textContent = text;
  chatContainer.appendChild(messageRow);
}

function addLoadingIndicator() {
  const id = "loading-" + Date.now();
  const loadingRow = document.createElement("div");
  loadingRow.className = "message-row ai";
  loadingRow.id = id;
  loadingRow.innerHTML = `
    <div class="message-avatar">AG</div>
    <div class="message-bubble">Escribiendo...</div>
  `;
  chatContainer.appendChild(loadingRow);
  return id;
}

function removeLoadingIndicator(id) {
  const el = document.getElementById(id);
  if (el) el.remove();
}

function updateSidebarHistory(text) {
  if (!historyList) return;

  const item = document.createElement("div");
  item.className = "history-item";
  const shortText = text.length > 20 ? text.substring(0, 20) + "..." : text;

  item.innerHTML = `<span>${shortText}</span>`;
  historyList.prepend(item);
}

sendButton.addEventListener("click", sendMessage);

userInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

function handleAttachFiles() {
  const fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.multiple = true;
  fileInput.accept = "image/*,.pdf,.txt,.doc,.docx"; 
  fileInput.click();

  fileInput.addEventListener("change", async () => {
    const files = Array.from(fileInput.files);

    for (const file of files) {
      const reader = new FileReader();

      if (file.type.startsWith("image/")) {

        reader.onload = (e) => {
          const messageRow = document.createElement("div");
          messageRow.className = "message-row user";
          messageRow.innerHTML = `
            <div class="message-avatar">U</div>
            <div class="message-bubble">
              <img src="${e.target.result}" alt="${file.name}" style="max-width:200px; border-radius:8px;" />
              <p>${file.name}</p>
            </div>
          `;
          chatContainer.appendChild(messageRow);
          scrollToBottom();
        };
        reader.readAsDataURL(file);

      } else if (file.type === "application/pdf") {

        reader.onload = async (e) => {
          const pdfData = new Uint8Array(e.target.result);
          try {
            const pdf = await pdfjsLib.getDocument(pdfData).promise;
            let textContent = "";

            for (let i = 1; i <= pdf.numPages; i++) {
              const page = await pdf.getPage(i);
              const content = await page.getTextContent();
              content.items.forEach(item => { textContent += item.str + " "; });
            }

            const messageRow = document.createElement("div");
            messageRow.className = "message-row user";
            messageRow.innerHTML = `
              <div class="message-avatar">U</div>
              <div class="message-bubble">
                <p><strong>Texto del PDF:</strong></p>
                <p>${textContent.substring(0, 400)}...</p>
              </div>
            `;
            chatContainer.appendChild(messageRow);
            scrollToBottom();

          } catch (error) {
            console.error("Error al procesar PDF:", error);
            const messageRow = document.createElement("div");
            messageRow.className = "message-row user";
            messageRow.innerHTML = `
              <div class="message-avatar">U</div>
              <div class="message-bubble">
                ❌ No pude extraer el contenido del PDF.
              </div>
            `;
            chatContainer.appendChild(messageRow);
            scrollToBottom();
          }
        };
        reader.readAsArrayBuffer(file);

      } else {

        const messageRow = document.createElement("div");
        messageRow.className = "message-row user";
        messageRow.innerHTML = `
          <div class="message-avatar">U</div>
          <div class="message-bubble">
            📄 ${file.name}
          </div>
        `;
        chatContainer.appendChild(messageRow);
        scrollToBottom();
      }
    }
  });
}

const attachBtn = document.querySelector(".tool-btn");
attachBtn.addEventListener("click", handleAttachFiles);