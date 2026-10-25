import React from 'react';

export default function UserAvatar({ name = '', avatar = '', size = 42, className = '' }) {
  const initials = (name || 'U')
    .split(' ')
    .map(p => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const [imageFailed, setImageFailed] = React.useState(false);

  if (avatar && !imageFailed) {
    return (
      <div className={`avatar-wrap ${className}`} style={{ width: size, height: size }}>
        <img
          src={avatar}
          alt={name}
          className="avatar-img"
          style={{ width: size, height: size }}
          onError={() => setImageFailed(true)}
        />
      </div>
    );
  }

  // Generate deterministic gradient based on name
  const charCode = (name || 'A').charCodeAt(0);
  const hue1 = (charCode * 45) % 360;
  const hue2 = (hue1 + 60) % 360;

  return (
    <div
      className={`avatar-placeholder ${className}`}
      style={{
        width: size,
        height: size,
        fontSize: Math.max(12, Math.floor(size * 0.38)),
        background: `linear-gradient(135deg, hsl(${hue1}, 70%, 55%), hsl(${hue2}, 75%, 45%))`
      }}
    >
      {initials}
    </div>
  );
}
