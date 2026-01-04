// Add task to today, tomorrow, or others
export async function addTask(text, type) {
  const result = await chrome.storage.local.get([type]);
  const tasks = result[type] || [];
  
  const newTask = {
    id: Date.now().toString(),
    text: text,
    completed: false,
    createdAt: new Date().toISOString()
  };
  
  tasks.push(newTask);
  await chrome.storage.local.set({ [type]: tasks });
}

// Add one task (special single task)
export async function addOneTask(text) {
  const oneTask = {
    text: text,
    createdAt: new Date().toISOString()
  };
  
  await chrome.storage.local.set({ oneTask });
}

// Add subtask with timer structure
export async function addSubtask(text) {
  const result = await chrome.storage.local.get(['subtasks']);
  const subtasks = result.subtasks || [];
  
  const newSubtask = {
    id: Date.now().toString(),
    text: text,
    completed: false,
    createdAt: new Date().toISOString(),
    timer: {
      isRunning: false,
      startTime: null,
      totalElapsed: 0
    }
  };
  
  subtasks.push(newSubtask);
  await chrome.storage.local.set({ subtasks });
}