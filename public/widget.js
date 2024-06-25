(function () {
  const createAuthButton = (appId, userId, targetElement) => {
    const button = document.createElement("button");
    button.innerText = "Authenticate your Google Drive When you are Ready";
    button.id = "authBtn";
    button.style.cssText =
      "padding: 10px 20px; font-size: 16px; margin: 10px 0; display: block;";

    button.addEventListener("click", function () {
      const redirectUri = `https://a0c1-142-116-173-206.ngrok-free.app/auth/google?app_id=${encodeURIComponent(
        appId
      )}&user_id=${encodeURIComponent(userId)}`;
      window.location.href = redirectUri;
    });

    if (targetElement) {
      targetElement.appendChild(button);
    } else {
      document.body.appendChild(button);
    }
  };

  const checkAuthentication = (appId, userId, callback) => {
    fetch(
      `http://localhost:3000/auth/check?app_id=${encodeURIComponent(
        appId
      )}&user_id=${encodeURIComponent(userId)}`
    )
      .then((response) => response.json())
      .then((data) => callback(data.authenticated))
      .catch((error) => {
        console.error("Error checking authentication status:", error);
        callback(false);
      });
  };

  // Extract attributes from the script tag
  const scriptTag = document.scripts[document.scripts.length - 1];
  const appId = scriptTag.getAttribute("data-app-id");
  const userId = scriptTag.getAttribute("data-user-id");
  const targetId = scriptTag.getAttribute("data-target-id");

  let targetElement = null;
  if (targetId) {
    targetElement = document.getElementById(targetId);
    if (!targetElement) {
      console.warn(
        `Target element with id "${targetId}" not found. Button will be placed at the bottom of the body.`
      );
    }
  }

  if (appId && userId) {
    checkAuthentication(appId, userId, (isAuthenticated) => {
      if (!isAuthenticated) {
        createAuthButton(appId, userId, targetElement);
      } else {
        console.log("User already authenticated.");
      }
    });
  } else {
    console.warn("App ID and User ID must be provided as data attributes.");
  }
})();
