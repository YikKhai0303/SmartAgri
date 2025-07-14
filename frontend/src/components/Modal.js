// Component - Modal (for form)
// frontend\src\components\Modal.js

import React, { useEffect } from 'react';

const Modal = ({ title, children, onClose }) => {
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  return (
    <div className="modal-container">
      <div className="modal-container-inner">
        <div className="modal-title">
          <div>{title}</div>
          <button className="modal-close-button" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-content">{children}</div>
      </div>
    </div>
  );
};

export default Modal;
