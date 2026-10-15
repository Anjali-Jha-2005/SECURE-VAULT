const correctPassword = "secure123";
let files = [];

function unlockLocker() {
  const input = document.getElementById("password").value;
  if (input === correctPassword) {
    document.getElementById("lockerContent").style.display = "block";
  } else {
    alert("Incorrect password!");
  }
}

function lockLocker() {
  document.getElementById("lockerContent").style.display = "none";
  document.getElementById("password").value = "";
}

function addFile() {
  const fileInput = document.getElementById("fileInput");
  if (fileInput.files.length > 0) {
    const fileName = fileInput.files[0].name;
    files.push(fileName);
    updateFileList();
  }
}

function updateFileList() {
  const list = document.getElementById("fileList");
  list.innerHTML = "";
  files.forEach(file => {
    const li = document.createElement("li");
    li.textContent = file;
    list.appendChild(li);
  });
}