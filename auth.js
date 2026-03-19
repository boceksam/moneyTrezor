document.addEventListener("DOMContentLoaded", async () => {
  const authForm = document.getElementById("authForm");
  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");
  const registerBtn = document.getElementById("registerBtn");
  const authMessage = document.getElementById("authMessage");

  if (!authForm || !emailInput || !passwordInput || !registerBtn || !authMessage) {
    console.warn("Auth prvky v index.html nebyly nalezeny.");
    return;
  }

  function showMessage(message, isError = false) {
    authMessage.textContent = message;
    authMessage.style.color = isError ? "#ff6b6b" : "#d4af37";
  }

  const { data: sessionData } = await supabase.auth.getSession();
  if (sessionData?.session) {
    window.location.href = "dashboard.html";
    return;
  }

  authForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();

    if (!email || !password) {
      showMessage("Vyplň email i heslo.", true);
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      showMessage(error.message, true);
      return;
    }

    window.location.href = "dashboard.html";
  });

  registerBtn.addEventListener("click", async () => {
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();

    if (!email || !password) {
      showMessage("Vyplň email i heslo.", true);
      return;
    }

    if (password.length < 6) {
      showMessage("Heslo musí mít alespoň 6 znaků.", true);
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password
    });

    if (error) {
      showMessage(error.message, true);
      return;
    }

    if (data?.session) {
      window.location.href = "dashboard.html";
      return;
    }

    showMessage("Registrace proběhla. Pokud je zapnuté potvrzení emailu, zkontroluj schránku.");
  });
});