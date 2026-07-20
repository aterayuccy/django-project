import heartMushroomAnimation from '../assets/characters/heart-mushroom.mp4';
import heartMushroomPoster from '../assets/characters/heart-mushroom-poster.png';
import orangeCatAnimation from '../assets/characters/orange-cat.mp4';
import orangeCatPoster from '../assets/characters/orange-cat-poster.png';
import tieDogAnimation from '../assets/characters/tie-dog.mp4';
import tieDogPoster from '../assets/characters/tie-dog-poster.png';
import rabbitAnimation from '../assets/objects/character-animation.mp4';
import rabbitPoster from '../assets/objects/character-poster.png';

export const builtInCharacters = [
  { id: 'rabbit', name: '兔子', animation: rabbitAnimation, poster: rabbitPoster },
  {
    id: 'heart-mushroom',
    name: '愛心蘑菇',
    animation: heartMushroomAnimation,
    poster: heartMushroomPoster,
  },
  { id: 'orange-cat', name: '橘貓', animation: orangeCatAnimation, poster: orangeCatPoster },
  { id: 'tie-dog', name: '領帶狗', animation: tieDogAnimation, poster: tieDogPoster },
];

export const builtInScenes = [
  { id: 'classroom', name: '教室' },
  { id: 'bedroom', name: '房間' },
  { id: 'garden', name: '花園' },
  { id: 'beach', name: '海邊' },
  { id: 'cafe', name: '咖啡館' },
  { id: 'forest', name: '森林' },
];
