document.addEventListener("DOMContentLoaded", () => {
  const input = document.getElementById("taskInput");
  const btn = document.getElementById("addTask");
  const list = document.getElementById("taskList");

  let tasks = JSON.parse(localStorage.getItem("tasks")) || [];

  function saveTasks() {
    localStorage.setItem("tasks", JSON.stringify(tasks));
  }

  function render() {
    list.innerHTML = "";
    tasks.forEach((task, index) => {
      const li = document.createElement("li");
      li.textContent = task;

      li.onclick = () => {
        tasks.splice(index, 1);
        saveTasks();
        render();
      };

      list.appendChild(li);
    });
  }

  btn.onclick = () => {
    if (input.value.trim() !== "") {
      tasks.push(input.value.trim());
      input.value = "";
      saveTasks();
      render();
    }
  };

  render();
});
