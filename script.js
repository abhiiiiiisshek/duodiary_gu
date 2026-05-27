/* She Can Foundation Client-side Controller (Multi-page safe) */

document.addEventListener('DOMContentLoaded', () => {
  // --- DOM Elements ---
  const htmlElement = document.documentElement;
  const themeToggleBtn = document.getElementById('theme-toggle-btn');
  const volunteerForm = document.getElementById('volunteer-form');
  const successDialog = document.getElementById('success-dialog');
  const modalCloseBtn = document.getElementById('modal-close-btn');
  const headerCtaBtn = document.getElementById('header-cta-btn');

  // ==========================================
  // 1. Theme Toggle & Accessibility Sync
  // ==========================================
  if (themeToggleBtn) {
    const savedTheme = localStorage.getItem('theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    let currentTheme = savedTheme || (systemPrefersDark ? 'dark' : 'light');
    setTheme(currentTheme);

    themeToggleBtn.addEventListener('click', () => {
      const newTheme = htmlElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      setTheme(newTheme);
    });

    function setTheme(theme) {
      htmlElement.setAttribute('data-theme', theme);
      localStorage.setItem('theme', theme);
      
      const isPressed = theme === 'dark';
      themeToggleBtn.setAttribute('aria-pressed', isPressed.toString());
    }
  }

  // ==========================================
  // 2. Active Page Navigation Sync
  // ==========================================
  const currentPath = window.location.pathname;
  const navHome = document.getElementById('link-home');
  const navAbout = document.getElementById('link-about');
  const navVolunteer = document.getElementById('link-volunteer');

  // Clear previous active states
  [navHome, navAbout, navVolunteer].forEach(link => {
    if (link) link.classList.remove('active');
  });

  // Assign active state based on current URL path
  if (currentPath.includes('about.html')) {
    if (navAbout) navAbout.classList.add('active');
  } else if (currentPath.includes('volunteer.html')) {
    if (navVolunteer) navVolunteer.classList.add('active');
  } else {
    // Default to home page
    if (navHome) navHome.classList.add('active');
  }

  // ==========================================
  // 3. Real-time Form Validation (Only runs on volunteer.html)
  // ==========================================
  if (volunteerForm) {
    const nameInput = document.getElementById('user-name');
    const emailInput = document.getElementById('user-email');
    const messageInput = document.getElementById('user-message');

    const fields = {
      name: {
        input: nameInput,
        group: nameInput.parentElement,
        validate: (val) => {
          const cleaned = val.trim();
          if (cleaned.length < 2) return false;
          return /^[\p{L}\s'-]+$/u.test(cleaned);
        }
      },
      email: {
        input: emailInput,
        group: emailInput.parentElement,
        validate: (val) => {
          const cleaned = val.trim();
          return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(cleaned);
        }
      },
      message: {
        input: messageInput,
        group: messageInput.parentElement,
        validate: (val) => {
          return val.trim().length >= 10;
        }
      }
    };

    // Apply real-time event listeners based on Validation Event Timing Matrix
    Object.keys(fields).forEach((key) => {
      const field = fields[key];

      // Validate when user tab-exits / blurs the input field
      field.input.addEventListener('blur', () => {
        validateField(field);
      });

      // Clear visual error feedback as soon as typing correction starts
      field.input.addEventListener('input', () => {
        clearFieldError(field);
      });
    });

    function validateField(field) {
      const isValid = field.validate(field.input.value);
      if (!isValid) {
        field.group.classList.add('invalid');
        field.input.setAttribute('aria-invalid', 'true');
        return false;
      } else {
        clearFieldError(field);
        return true;
      }
    }

    function clearFieldError(field) {
      field.group.classList.remove('invalid');
      field.input.removeAttribute('aria-invalid');
    }

    // Submit handler
    volunteerForm.addEventListener('submit', (e) => {
      e.preventDefault();

      let firstInvalidInput = null;
      let isFormValid = true;

      // Validate all inputs before submitting
      Object.keys(fields).forEach((key) => {
        const field = fields[key];
        const isValid = validateField(field);
        
        if (!isValid) {
          isFormValid = false;
          if (!firstInvalidInput) {
            firstInvalidInput = field.input;
          }
        }
      });

      if (!isFormValid) {
        if (firstInvalidInput) {
          firstInvalidInput.focus();
        }
        return;
      }

      // Simulate submission loading indicator
      const submitBtn = document.getElementById('form-submit-btn');
      const submitBtnText = submitBtn.querySelector('span');
      const originalText = submitBtnText.textContent;
      
      submitBtn.disabled = true;
      submitBtn.setAttribute('aria-disabled', 'true');
      submitBtnText.textContent = "Submitting application...";

      setTimeout(() => {
        submitBtn.disabled = false;
        submitBtn.removeAttribute('aria-disabled');
        submitBtnText.textContent = originalText;

        // Show Success Overlay Modal
        if (successDialog) {
          successDialog.showModal();
          if (modalCloseBtn) {
            modalCloseBtn.focus();
          }
        }

        volunteerForm.reset();
      }, 1200);
    });
  }

  // Success Dialog Modal Handlers
  if (successDialog && modalCloseBtn) {
    modalCloseBtn.addEventListener('click', () => {
      successDialog.close();
      if (headerCtaBtn) {
        headerCtaBtn.focus();
      }
    });

    successDialog.addEventListener('click', (event) => {
      const rect = successDialog.getBoundingClientRect();
      const isInDialog = (
        rect.top <= event.clientY && event.clientY <= rect.top + rect.height &&
        rect.left <= event.clientX && event.clientX <= rect.left + rect.width
      );
      if (!isInDialog) {
        successDialog.close();
        if (headerCtaBtn) {
          headerCtaBtn.focus();
        }
      }
    });
  }
});
