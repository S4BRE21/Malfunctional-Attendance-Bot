// modules/dashboard/DashboardUtils.js - Shared utilities and helpers
// Extracted from adminDashboard.js for better modularity

export class DashboardUtils {
  constructor() {
    // Utility class - no state needed
  }

  // Helper function to determine user role for display
  getUserRole(user) {
    if (user.is_admin) {
      return 'OFFICER';
    }
    
    // Check if user has F&F role (website-side only)
    if (user.ff_role || this.isUserInFFList(user.id)) {
      return 'F&F';
    }
    
    // Default to RAIDER
    return 'RAIDER';
  }

  // Helper function to check if user is in F&F list (website-side storage)
  isUserInFFList(userId) {
    try {
      const ffUsers = JSON.parse(localStorage.getItem('ffUsers') || '[]');
      return ffUsers.includes(userId);
    } catch (e) {
      return false;
    }
  }

  // Helper function to add/remove user from F&F list
  toggleFFRole(userId, isFF) {
    try {
      let ffUsers = JSON.parse(localStorage.getItem('ffUsers') || '[]');
      
      if (isFF && !ffUsers.includes(userId)) {
        ffUsers.push(userId);
      } else if (!isFF && ffUsers.includes(userId)) {
        ffUsers = ffUsers.filter(id => id !== userId);
      }
      
      localStorage.setItem('ffUsers', JSON.stringify(ffUsers));
      return true;
    } catch (e) {
      console.error('[DashboardUtils] Error managing F&F list:', e);
      return false;
    }
  }

  // Get friends & family users from the users list
  getFriendsFamilyUsers(users) {
    try {
      const ffUsers = JSON.parse(localStorage.getItem('ffUsers') || '[]');
      return users.filter(user => ffUsers.includes(user.id));
    } catch (e) {
      return [];
    }
  }

  // Create centered confirmation modal
  createConfirmationModal(title, message, confirmText, cancelText, onConfirm) {
    // Remove existing modal if any
    const existingModal = document.getElementById('confirmationModal');
    if (existingModal) {
      existingModal.remove();
    }
    
    const modal = document.createElement('div');
    modal.id = 'confirmationModal';
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(0, 0, 0, 0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10005;
      animation: fadeIn 0.2s ease-out;
    `;
    
    const content = document.createElement('div');
    content.style.cssText = `
      background: linear-gradient(145deg, #2a2d3a, #1e1f29);
      border-radius: 15px;
      padding: 2rem;
      max-width: 400px;
      width: 90%;
      color: white;
      text-align: center;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6);
      border: 2px solid rgba(255, 255, 255, 0.3);
      animation: modalSlideIn 0.3s ease-out;
    `;
    
    content.innerHTML = `
      <h3 style="margin-top: 0; color: #ffc107; font-size: 1.5rem; margin-bottom: 1rem;">${title}</h3>
      <p style="margin-bottom: 2rem; line-height: 1.6; color: rgba(255, 255, 255, 0.9);">${message}</p>
      <div style="display: flex; gap: 1rem; justify-content: center;">
        <button id="confirmBtn" style="
          background: #f44336;
          color: white;
          border: none;
          padding: 0.75rem 1.5rem;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 600;
          transition: background 0.2s ease;
        ">${confirmText}</button>
        <button id="cancelBtn" style="
          background: #757575;
          color: white;
          border: none;
          padding: 0.75rem 1.5rem;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 600;
          transition: background 0.2s ease;
        ">${cancelText}</button>
      </div>
    `;
    
    modal.appendChild(content);
    document.body.appendChild(modal);
    
    // Add hover effects
    const confirmBtn = content.querySelector('#confirmBtn');
    const cancelBtn = content.querySelector('#cancelBtn');
    
    confirmBtn.addEventListener('mouseenter', () => confirmBtn.style.background = '#d32f2f');
    confirmBtn.addEventListener('mouseleave', () => confirmBtn.style.background = '#f44336');
    cancelBtn.addEventListener('mouseenter', () => cancelBtn.style.background = '#616161');
    cancelBtn.addEventListener('mouseleave', () => cancelBtn.style.background = '#757575');
    
    // Handle buttons
    confirmBtn.addEventListener('click', () => {
      modal.remove();
      onConfirm();
    });
    
    cancelBtn.addEventListener('click', () => {
      modal.remove();
    });
    
    // ESC key to cancel
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        modal.remove();
        document.removeEventListener('keydown', handleEsc);
      }
    };
    document.addEventListener('keydown', handleEsc);
    
    // Click outside to cancel
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });
  }

  // Utility methods
  escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  truncateText(text, maxLength) {
    if (!text) return '';
    return text.length <= maxLength ? text : text.substring(0, maxLength) + '...';
  }

  formatUserDisplayName(user) {
    return user.global_name || user.username || 'Unknown User';
  }

  generateAvatarLetter(user) {
    const displayName = this.formatUserDisplayName(user);
    return displayName.charAt(0).toUpperCase();
  }

  isProtectedUser(userId) {
    return userId === '232260865452146688'; // DarkSparrow protection
  }

  getRoleClass(userRole) {
    switch (userRole) {
      case 'OFFICER': return 'role-admin';
      case 'F&F': return 'role-ff';
      case 'RAIDER':
      default: return 'role-raider';
    }
  }

  getRoleDisplayText(userRole) {
    switch (userRole) {
      case 'OFFICER': return 'OFFICER 👑';
      case 'F&F': return 'FRIENDS & FAMILY';
      case 'RAIDER':
      default: return 'RAIDER';
    }
  }

  showSuccessMessage(message) {
    const successMsg = document.createElement('div');
    successMsg.className = 'notification-banner success-banner';
    successMsg.innerHTML = `✅ ${message}`;
    successMsg.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: linear-gradient(145deg, #4caf50, #388e3c);
      color: white;
      padding: 1rem 1.5rem;
      border-radius: 12px;
      box-shadow: 0 8px 16px rgba(76, 175, 80, 0.3);
      z-index: 10000;
      font-weight: 600;
      animation: slideInRight 0.3s ease-out;
    `;
    
    document.body.appendChild(successMsg);
    setTimeout(() => {
      successMsg.style.animation = 'slideOutRight 0.3s ease-in';
      setTimeout(() => successMsg.remove(), 300);
    }, 3000);
  }

  showErrorMessage(message) {
    const errorMsg = document.createElement('div');
    errorMsg.className = 'notification-banner error-banner';
    errorMsg.innerHTML = `❌ ${message}`;
    errorMsg.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: linear-gradient(145deg, #f44336, #d32f2f);
      color: white;
      padding: 1rem 1.5rem;
      border-radius: 12px;
      box-shadow: 0 8px 16px rgba(244, 67, 54, 0.3);
      z-index: 10000;
      font-weight: 600;
      animation: slideInRight 0.3s ease-out;
    `;
    
    document.body.appendChild(errorMsg);
    setTimeout(() => {
      errorMsg.style.animation = 'slideOutRight 0.3s ease-in';
      setTimeout(() => errorMsg.remove(), 300);
    }, 5000);
  }
}

// Add CSS for modal animations
const modalStyles = document.createElement('style');
modalStyles.textContent = `
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  
  @keyframes modalSlideIn {
    from { transform: scale(0.8); opacity: 0; }
    to { transform: scale(1); opacity: 1; }
  }

  @keyframes slideInRight {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }

  @keyframes slideOutRight {
    from { transform: translateX(0); opacity: 1; }
    to { transform: translateX(100%); opacity: 0; }
  }
`;
document.head.appendChild(modalStyles);
