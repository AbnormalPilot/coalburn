// copy the install command
const copyBtn = document.getElementById('copy');
const installCmd = document.getElementById('install-cmd');

copyBtn.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(installCmd.textContent);
    copyBtn.textContent = 'Copied';
  } catch {
    // no clipboard access, select it so ctrl+c works
    getSelection().selectAllChildren(installCmd);
    copyBtn.textContent = 'Press Ctrl+C';
  }
  setTimeout(() => (copyBtn.textContent = 'Copy'), 1800);
});

// replay the terminal output line by line
const lines = [...document.querySelectorAll('#term .line')];
const replayBtn = document.getElementById('replay');
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
let timers = [];

function play() {
  timers.forEach(clearTimeout);
  timers = [];
  replayBtn.classList.remove('visible');
  lines.forEach((line) => line.classList.remove('shown'));

  let at = 400;
  for (const line of lines) {
    at += Number(line.dataset.wait);
    timers.push(setTimeout(() => line.classList.add('shown'), at));
  }
  timers.push(setTimeout(() => replayBtn.classList.add('visible'), at + 600));
}

if (reduceMotion) {
  lines.forEach((line) => line.classList.add('shown'));
} else {
  play();
  replayBtn.addEventListener('click', play);
}
