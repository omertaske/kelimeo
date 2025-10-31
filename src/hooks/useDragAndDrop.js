import { useState } from 'react';

/**
 * Drag & Drop işlemleri için custom hook
 */
export const useDragAndDrop = () => {
  const [draggingLetter, setDraggingLetter] = useState(null);
  const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 });

  const startDrag = (letter, event) => {
    setDraggingLetter(letter);
    if (event) {
      setCursorPosition({ x: event.clientX, y: event.clientY });
    }
  };

  const updatePosition = (event) => {
    if (draggingLetter) {
      setCursorPosition({ x: event.clientX, y: event.clientY });
    }
  };

  const endDrag = () => {
    setDraggingLetter(null);
  };

  const isDragging = draggingLetter !== null;

  return {
    draggingLetter,
    cursorPosition,
    isDragging,
    startDrag,
    updatePosition,
    endDrag
  };
};
