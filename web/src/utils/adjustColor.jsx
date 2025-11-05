function adjustColor(color, amount) {
  return '#' + color.slice(1).match(/.{2}/g)
    .map(hex => {
      const val = Math.min(255, Math.max(0, parseInt(hex, 16) + amount));
      return val.toString(16).padStart(2, '0');
    })
    .join('');
}

export default adjustColor;