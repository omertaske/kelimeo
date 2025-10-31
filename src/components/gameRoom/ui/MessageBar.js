import React from 'react';

const MessageBar = ({ message }) => {
  if (!message) return null;

  return (
    <div className="message-bar">
      {message}
    </div>
  );
};

export default MessageBar;
