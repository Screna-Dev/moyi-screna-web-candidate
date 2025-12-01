
import robot1 from '../assets/images/ai-avatars/robot1.png';
import robot2 from '../assets/images/ai-avatars/robot2.png';
import robot3 from '../assets/images/ai-avatars/robot3.png';
import robot4 from '../assets/images/ai-avatars/robot4.png';
import robot5 from '../assets/images/ai-avatars/robot5.png';

export const randomAINames = ['Alex AI', 'Sam Bot', 'Taylor AI', 'Jordan Bot', 'Sky AI'];

export const randomAIAvatars = [robot1, robot2, robot3, robot4, robot5]

export const generateRandomAI = () => {
  const name = randomAINames[Math.floor(Math.random() * randomAINames.length)];
  const avatar = randomAIAvatars[Math.floor(Math.random() * randomAIAvatars.length)];
  return { name, avatar };
};
