// Delete task from today, tomorrow, or others
export async function deleteTask(id, type) {
  const result = await chrome.storage.local.get([type]);
  const tasks = result[type] || [];
  
  const updatedTasks = tasks.filter(task => task.id !== id);
  await chrome.storage.local.set({ [type]: updatedTasks });
}

// Delete one task (special single task)
export async function deleteOneTask() {
  await chrome.storage.local.remove(['oneTask']);
  await chrome.storage.local.remove(['subtasks']);
}