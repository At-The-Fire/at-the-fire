import React, { useState } from 'react';
import './SparkFire.css';

function SparkFire() {
  const [isFireOff, setIsFireOff] = useState(true);

  // Utility function to apply style to elements with 'fire' in their class name
  const applyFireTransform = (className) => {
    if (className.includes('fire') && isFireOff) {
      return { transform: 'scale(2.25, 2.4)' };
    }
    return {};
  };
  return (
    <div>
      <div className={isFireOff ? 'fire-off' : ''}>
        <div className="fire-on"></div>

        <div className="switch-wrap">
          <div
            id="switch"
            className={isFireOff ? 'switched' : ''}
            onClick={() => setIsFireOff((prevState) => !prevState)}
          >
            <div id="circle"></div>
          </div>
        </div>

        <div className="name">
          CSS<span>spark</span>
        </div>

        <div className="section-center">
          <div className="moon">
            <div></div>
            <div></div>
            <div></div>
          </div>
          <div className="shooting-star"></div>
          <div className="shooting-star-2"></div>
          <div className="star"></div>
          <div className="star snd"></div>
          <div className="star trd"></div>
          <div className="star fth"></div>
          <div className="star fith"></div>
          <div className="circle"></div>
          <div className="wood-circle"></div>
          <div className="wood"></div>
          <div className="tree-1"></div>
          <div className="tree-2"></div>
          <div className="fire" style={applyFireTransform('fire')}>
            <span></span>
            <span></span>
            <span></span>
          </div>

          <div className="smoke">
            <span className="s-0"></span>
            <span className="s-1"></span>
            <span className="s-2"></span>
            <span className="s-3"></span>
            <span className="s-4"></span>
            <span className="s-5"></span>
            <span className="s-6"></span>
            <span className="s-7"></span>
            <span className="s-8"></span>
            <span className="s-9"></span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SparkFire;
