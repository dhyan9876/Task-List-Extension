// Delete task from queue
export async function deleteTask(id) {
  const result = await chrome.storage.local.get(['tasks']);
  const tasks = result.tasks || [];
  
  const updatedTasks = tasks.filter(task => task.id !== id);
  await chrome.storage.local.set({ tasks: updatedTasks });
}