// Add task to the queue
export async function addTask(text) {
  const result = await chrome.storage.local.get(['tasks']);
  const tasks = result.tasks || [];
  
  const newTask = {
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
  
  tasks.push(newTask);
  await chrome.storage.local.set({ tasks });
}