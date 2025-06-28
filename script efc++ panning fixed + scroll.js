// Items array: This array holds the titles for the project items. These titles will be displayed when an item is expanded.
const items = [
  "Silent Shadows",
  "Lonely Light",
  "Quiet Void",
  "Fading Contrast",
  "Empty Horizon",
  "Monochrome Silence",
  "Dark Whisper",
  "Pale Echo",
  "Stark Solitude",
  "Bleak Reflection",
  "Isolated Shade",
  "Muted Dusk",
  "Grey Emptiness",
  "Cold Absence",
  "Bare Twilight",
  "Still Dusk",
  "Vacant Gloom",
  "Quiet Eclipse",
  "Dim Silence",
  "Hollow Night"
];

// NAV ANIMATION - COMPLETELY SEPARATE FROM MAIN CODE
// Initializes the navigation animation. It waits for SplitType and GSAP libraries to load
// before performing the animation.
function initNavAnimation() {
  const nav = document.querySelector('nav');
  if (!nav) return; // If no navigation element is found, exit the function.

  // checkLibraries: A recursive function to continuously check if SplitType and GSAP are available.
  const checkLibraries = () => {
    if (typeof SplitType !== 'undefined' && typeof gsap !== 'undefined') {
      performNavAnimation(nav); // If both libraries are loaded, start the animation.
    } else {
      setTimeout(checkLibraries, 10); // Otherwise, check again after 10 milliseconds.
    }
  };

  checkLibraries(); // Start checking immediately when the function is called.
}

// performNavAnimation: Executes the navigation text animation using SplitType and GSAP.
function performNavAnimation(nav) {
  // const originalText = nav.textContent; // Stores the original text content of the nav (currently unused).

  try {
    // navSplit: Creates a new SplitType instance to split the navigation text into individual characters.
    const navSplit = new SplitType(nav, {
      types: "chars", // Split by characters.
      tagName: "span" // Wrap each character in a <span> tag.
    });

    // Ensures each character span has proper styling for animation.
    navSplit.chars.forEach(char => {
      char.style.display = 'inline-block'; // Makes sure characters are block elements for `y` translation.
      char.style.willChange = 'transform'; // Optimizes performance for transform animations.
    });

    // Sets the initial state of characters: moved down 100% and invisible.
    gsap.set(navSplit.chars, {
      y: "100%",
      opacity: 0
    });

    // Animates characters up from the bottom with a stagger effect.
    gsap.to(navSplit.chars, {
      y: "0%", // Animate to original vertical position.
      opacity: 1, // Fade in.
      duration: 0.5, // Duration of each character's animation.
      stagger: 0.08, // Delay between each character's animation.
      ease: "power3.out", // Easing function for a smooth effect.
      delay: 0.2, // Initial delay before the animation starts.
      force3D: true // Forces hardware acceleration for smoother animations.
    });

  } catch (error) {
    console.log('Nav animation fallback');
    // Fallback if SplitType or GSAP initialization fails: simple fade in.
    nav.style.opacity = '0';
    gsap.to(nav, {
      opacity: 1,
      duration: 1,
      delay: 0.2,
      ease: "power2.out"
    });
  }
}

// START IMMEDIATELY: Global variable declarations and initial setup.
const container = document.querySelector(".container") || document.body; // Main container for the canvas.
const canvas = document.querySelector(".canvas") || container; // The canvas element where items are placed.
const overlay = document.querySelector(".overlay"); // Overlay for expanded item view.
const projectTitleElem = document.querySelector(".project-title p"); // Element to display project titles.

// Grid and item dimensions.
const itemCount = 20; // Total number of unique items (images and titles).
const itemGap = 150; // Gap between items in pixels.
const columns = 4; // Number of columns in the grid.
const itemWidth = 120; // Width of each item.
const itemHeight = 160; // Height of each item.

// Dragging and animation state variables.
let isDragging = false; // True if the user is currently dragging.
let startX, startY; // Starting mouse/touch coordinates for drag.
let targetX = 0; // Target X position for canvas animation.
let targetY = 0; // Target Y position for canvas animation.
let currentX = 0; // Current X position of the canvas.
let currentY = 0; // Current Y position of the canvas.
let dragVelocityX = 0; // X velocity of the drag for momentum.
let dragVelocityY = 0; // Y velocity of the drag for momentum.
let lastDragTime = 0; // Timestamp of the last drag event.
let mouseHasMoved = false; // Flag to check if mouse moved during click (to prevent accidental clicks).
let visibleItems = new Set(); // Stores IDs of currently visible items for efficient management.
let lastUpdateTime = 0; // Timestamp of the last visibility update.
let lastX = 0; // Last X position of the canvas for visibility check.
let lastY = 0; // Last Y position of the canvas for visibility check.
let isExpanded = false; // True if an item is currently expanded.
let activeItem = null; // Reference to the currently active (expanded) item element.
let canDrag = true; // Flag to enable/disable dragging.
let originalPosition = null; // Stores original position and size of an item before expansion.
let expandedItem = null; // Reference to the dynamically created expanded item element.
let activeItemId = null; // ID of the currently active item.
let titleSplit = null; // SplitType instance for the project title.
let isAnimatingTitle = false; // Flag to prevent multiple title animations.
let hoveredItem = null; // Reference to the item currently being hovered over.
let initialAnimationDone = false; // True once the initial loading animation is complete.
let initialVisibleItems = new Set(); // Set of items initially visible on load.

// Mouse panning variables: For subtle canvas movement based on mouse position.
let panTargetX = 0; // Target X position for mouse pan effect.
let panTargetY = 0; // Target Y position for mouse pan effect.
let panCurrentX = 0; // Current X position of the mouse pan effect.
let panCurrentY = 0; // Current Y position of the mouse pan effect.
let panActive = false; // True if the mouse pan animation is active.
let panAnimation = null; // GSAP TweenMax instance for mouse pan animation.
const panStrength = 0.4; // How strong the panning effect is.
const panRange = 250; // The maximum range of the pan effect.

// NEW: Frozen panning variables
// These variables are used to "freeze" the current pan position when an item is expanded,
// preventing further panning while the expanded view is active.
let frozenPanX = 0; // Stores the panCurrentX value when an item is expanded.
let frozenPanY = 0; // Stores the panCurrentY value when an item is expanded.
let isPanningFrozen = false; // True if panning is temporarily frozen.
let waitingForMouseMove = false; // Flag to wait for mouse movement before unfreezing pan.
let lastMouseX = 0; // Last recorded mouse X position, used for `waitingForMouseMove`.
let lastMouseY = 0; // Last recorded mouse Y position, used for `waitingForMouseMove`.

// NEW: Scrolling variables
// These variables manage the custom scrolling behavior of the canvas.
let scrollOffsetX = 0; // Current horizontal scroll offset.
let scrollOffsetY = 0; // Current vertical scroll offset.
const scrollSpeed = 0.8; // Determines how fast the canvas scrolls in response to wheel input.

// Calculate initially visible items IMMEDIATELY: Determines which items should be rendered on page load.
function getInitialVisibleItems() {
  const viewWidth = window.innerWidth;
  const viewHeight = window.innerHeight;
  const buffer = 1; // Buffer to ensure items slightly outside the viewport are included.

  // Calculate the column and row range that are initially visible.
  const startCol = Math.floor(-viewWidth * buffer / (itemWidth + itemGap));
  const endCol = Math.ceil(viewWidth * buffer / (itemWidth + itemGap));
  const startRow = Math.floor(-viewHeight * buffer / (itemHeight + itemGap));
  const endRow = Math.ceil(viewHeight * buffer / (itemHeight + itemGap));

  const initialItems = new Set();

  // Populate the set with IDs of initially visible items.
  for (let row = startRow; row <= endRow; row++) {
    for (let col = startCol; col <= endCol; col++) {
      initialItems.add(`${col},${row}`);
    }
  }

  return initialItems;
}

// Create initial visible items INSTANTLY: Renders the items determined by `getInitialVisibleItems`.
function createInitialItems() {
  initialVisibleItems = getInitialVisibleItems(); // Get the set of item IDs to create.

  initialVisibleItems.forEach(itemId => {
    const [col, row] = itemId.split(',').map(Number); // Parse column and row from the ID.

    const item = document.createElement("div");
    item.className = "item"; // Assign CSS class.
    item.id = itemId; // Set unique ID.
    item.style.left = `${col * (itemWidth + itemGap)}px`; // Position item horizontally.
    item.style.top = `${row * (itemHeight + itemGap)}px`; // Position item vertically.
    item.dataset.col = col; // Store column in dataset.
    item.dataset.row = row; // Store row in dataset.

    // Calculate which image to use based on item's grid position.
    const itemNum = (Math.abs(row * columns + col) % itemCount) + 1;
    const img = document.createElement("img");
    img.src = `public/${itemNum}.jpeg`; // Set image source.
    img.alt = `Image ${itemNum}`; // Set alt text.
    item.appendChild(img); // Add image to the item.

    // Set initial state immediately with rotateX for the loading animation.
    item.style.opacity = '0';
    item.style.transform = 'translateY(64px) scale(1.5) rotateX(40deg)';
    item.style.transition = 'none'; // Disable transition for immediate state application.

    // Add event listeners for hover effects.
    item.addEventListener("mouseenter", (e) => {
      if (!canDrag || isDragging || isExpanded) return; // Only apply hover if not dragging or expanded.
      hoveredItem = item; // Set the currently hovered item.
      if (window.gsap) {
        gsap.to(item, {
          scale: 1.2, // Scale up on hover.
          duration: 0.3,
          ease: "power2.out"
        });
      }
    });

    item.addEventListener("mouseleave", (e) => {
      if (!canDrag || isDragging || isExpanded) return; // Only apply hover out if not dragging or expanded.
      if (hoveredItem === item) {
        hoveredItem = null; // Clear hovered item if this was the one.
      }
      if (window.gsap) {
        gsap.to(item, {
          scale: 1, // Scale back to original size.
          duration: 0.3,
          ease: "power2.out"
        });
      }
    });

    // Add click listener to expand the item.
    item.addEventListener("click", (e) => {
      if (mouseHasMoved || isDragging) return; // Prevent click if mouse was dragged.
      handleItemClick(item); // Handle the item click event.
    });

    canvas.appendChild(item); // Add the item to the canvas.
    visibleItems.add(itemId); // Add the item's ID to the set of visible items.
  });
}

// Start loading animation for only visible items - MUCH faster trigger.
function startLoadingAnimation() {
  // Immediate check with very short timeout to see if GSAP is available.
  if (typeof gsap === 'undefined') {
    const startTime = Date.now();
    const checkGsap = () => {
      if (typeof gsap !== 'undefined') {
        performLoadingAnimation(); // If GSAP is loaded, perform the animation.
      } else if (Date.now() - startTime < 200) {
        setTimeout(checkGsap, 1); // Continue checking every 1ms for the first 200ms.
      } else {
        performLoadingAnimationFallback(); // Fallback if GSAP still not loaded after 200ms.
      }
    };
    checkGsap();
    return;
  }

  // If GSAP is available immediately, start animation right away.
  performLoadingAnimation();
}

// performLoadingAnimation: Animates the initially visible items using GSAP.
function performLoadingAnimation() {
  // Register GSAP plugins if available (like CustomEase).
  if (typeof gsap !== 'undefined' && typeof CustomEase !== 'undefined') {
    gsap.registerPlugin(CustomEase);
    CustomEase.create("hop", "0.9, 0, 0.1, 1"); // Define a custom easing function.
  }

  const initialItems = Array.from(document.querySelectorAll('.item')); // Get all initially created items.

  // Animate only the initially visible items with a rotateX animation.
  if (typeof gsap !== 'undefined') {
    gsap.to(initialItems, {
      opacity: 1, // Fade in.
      y: 0, // Move to original Y position.
      scale: 1, // Scale to original size.
      rotateX: 0, // Rotate from 40deg to 0deg.
      duration: 1.3, // Duration of the overall animation.
      stagger: 0.015, // Stagger effect for individual items.
      ease: typeof CustomEase !== 'undefined' ? "hop" : "power2.out", // Use custom ease if available.
      onComplete: () => {
        initialAnimationDone = true; // Set flag when animation is complete.
      }
    });
  }
}

// Fallback animation without GSAP: Provides a basic animation if GSAP isn't loaded.
function performLoadingAnimationFallback() {
  const initialItems = Array.from(document.querySelectorAll('.item'));

  initialItems.forEach((item, index) => {
    setTimeout(() => {
      item.style.transition = 'all 0.4s ease-out'; // Apply a CSS transition.
      item.style.opacity = '1';
      item.style.transform = 'translateY(0px) scale(1) rotateX(0deg)';
    }, index * 15); // Stagger using setTimeout.
  });

  setTimeout(() => {
    initialAnimationDone = true; // Set flag after estimated animation completion.
  }, initialItems.length * 15 + 400);
}

// setAndAnimateTitle: Prepares and sets the project title for animation.
function setAndAnimateTitle(title) {
  if (!projectTitleElem) return; // Exit if title element is not found.

  if (titleSplit) {
    titleSplit.revert(); // Revert any previous SplitType changes.
  }
  projectTitleElem.textContent = title; // Set the new title text.
  projectTitleElem.style.fontSize = '2em'; // Adjust font size for expanded view.
  projectTitleElem.style.overflow = 'hidden'; // Hide overflow for word animation.

  if (typeof SplitType !== 'undefined') {
    titleSplit = new SplitType(projectTitleElem, {
      types: "words" // Split the title into words.
    });
    if (window.gsap) {
      gsap.set(titleSplit.words, {
        y: "100%" // Set initial position for words (below visible area).
      });
    }
  }
}

// animateTitleIn: Animates the project title words into view.
function animateTitleIn() {
  if (isAnimatingTitle || !titleSplit || !window.gsap) return; // Prevent multiple animations or if conditions not met.
  isAnimatingTitle = true; // Set flag to indicate animation in progress.

  gsap.to(titleSplit.words, {
    y: "0%", // Animate words to their original Y position.
    duration: 0.8,
    stagger: 0.08,
    ease: "power3.out",
    onComplete: () => {
      isAnimatingTitle = false; // Reset flag when animation completes.
    }
  });
}

// animateTitleOut: Animates the project title words out of view and resets the element.
function animateTitleOut(callback) {
  if (isAnimatingTitle || !titleSplit || !window.gsap) return; // Prevent multiple animations or if conditions not met.
  isAnimatingTitle = true; // Set flag to indicate animation in progress.

  gsap.to(titleSplit.words, {
    y: "-100%", // Animate words upwards out of view.
    duration: 0.8,
    stagger: 0.08,
    ease: "power3.out",
    onComplete: () => {
      isAnimatingTitle = false; // Reset flag.
      if (titleSplit) {
        titleSplit.revert(); // Revert SplitType changes.
      }
      if (projectTitleElem) {
        projectTitleElem.textContent = ''; // Clear title text.
        projectTitleElem.style.fontSize = '1em'; // Reset font size.
        projectTitleElem.style.overflow = 'visible'; // Reset overflow.
      }
      if (callback) callback(); // Execute callback if provided.
    }
  });
}

// handleMousePan: Controls the subtle panning effect based on mouse position.
function handleMousePan(e) {
  const mouseX = e.clientX;
  const mouseY = e.clientY;

  // If waiting for mouse movement after closing expanded item (to smoothly reactivate pan).
  if (waitingForMouseMove) {
    // Check if the mouse has moved sufficiently to unfreeze panning.
    const mouseMoved = Math.abs(mouseX - lastMouseX) > 5 || Math.abs(mouseY - lastMouseY) > 5;
    if (mouseMoved) {
      waitingForMouseMove = false;
      isPanningFrozen = false;
      // Smoothly animate panCurrentX and panCurrentY to match the new panTargetX/Y.
      if (window.gsap) {
        gsap.to(this, { // 'this' refers to the global scope or object where panCurrentX/Y exist.
          panCurrentX: (mouseX / window.innerWidth - 0.5) * panRange * panStrength,
          panCurrentY: (mouseY / window.innerHeight - 0.5) * panRange * panStrength,
          duration: 0.5, // Duration for the smooth transition.
          ease: "power2.out",
          onUpdate: () => {
            // Update panTargetX/Y to the current mouse position during the transition.
            panTargetX = (mouseX / window.innerWidth - 0.5) * panRange * panStrength;
            panTargetY = (mouseY / window.innerHeight - 0.5) * panRange * panStrength;
          }
        });
      } else {
        panCurrentX = (mouseX / window.innerWidth - 0.5) * panRange * panStrength;
        panCurrentY = (mouseY / window.innerHeight - 0.5) * panRange * panStrength;
      }
    } else {
      return; // If not moved enough, keep panning frozen.
    }
  }

  if (!canDrag || isDragging || isExpanded || isPanningFrozen) return; // Skip if dragging, expanded, or pan is frozen.

  const xDecimal = mouseX / window.innerWidth;
  const yDecimal = mouseY / window.innerHeight;

  // Calculate pan offsets based on mouse position relative to the viewport.
  const panOffsetX = (xDecimal - 0.5) * panRange * panStrength;
  const panOffsetY = (yDecimal - 0.5) * panRange * panStrength;

  panTargetX = panOffsetX; // Set new target for pan animation.
  panTargetY = panOffsetY; // Set new target for pan animation.

  if (!panActive) {
    panActive = true; // Activate pan animation if not already active.
    startPanAnimation(); // Start the pan animation loop.
  }
}

// startPanAnimation: Initiates a GSAP tween to smoothly update `panCurrentX` and `panCurrentY`.
function startPanAnimation() {
  if (!window.gsap) return;

  if (panAnimation) {
    panAnimation.kill(); // Kill any existing pan animation to prevent conflicts.
  }

  panAnimation = gsap.to({}, {
    duration: 2, // Duration of the internal tween (controls how long it tries to reach target).
    ease: "power2.out",
    onUpdate: function() {
      if (!canDrag || isDragging || isExpanded || isPanningFrozen) return;

      const panEase = 0.08; // Easing factor for pan movement.
      panCurrentX += (panTargetX - panCurrentX) * panEase; // Smoothly move current X towards target X.
      panCurrentY += (panTargetY - panCurrentY) * panEase; // Smoothly move current Y towards target Y.
    },
    onComplete: () => {
      panActive = false; // Deactivate pan once the target is reached (or animation ends).
    }
  });
}

// updateVisibleItems: Manages the creation and removal of items based on their visibility within the viewport.
function updateVisibleItems() {
  const buffer = 2.5; // Larger buffer to preload items outside the immediate viewport.
  const viewWidth = window.innerWidth * (1 + buffer);
  const viewHeight = window.innerHeight * (1 + buffer);
  const movingRight = targetX > currentX; // Check canvas movement direction.
  const movingDown = targetY > currentY;
  const directionBufferX = movingRight ? -300 : 300; // Add directional buffer for item loading.
  const directionBufferY = movingDown ? -300 : 300;

  // Calculate the column and row range that should be currently visible based on canvas position.
  const startCol = Math.floor(
    (-currentX - viewWidth / 2 + (movingRight ? directionBufferX : 0)) /
    (itemWidth + itemGap)
  );

  const endCol = Math.ceil(
    (-currentX + viewWidth / 2 + (!movingRight ? directionBufferX : 0)) /
    (itemWidth + itemGap)
  );

  const startRow = Math.floor(
    (-currentY - viewHeight / 2 + (movingDown ? directionBufferY : 0)) /
    (itemHeight + itemGap)
  );

  const endRow = Math.ceil(
    (-currentY + viewHeight / 2 + (!movingDown ? directionBufferY : 0)) /
    (itemHeight + itemGap)
  );

  const currentItems = new Set(); // Set to hold IDs of items that *should* be visible.

  // Iterate through the calculated grid cells.
  for (let row = startRow; row <= endRow; row++) {
    for (let col = startCol; col <= endCol; col++) {
      const itemId = `${col},${row}`;
      currentItems.add(itemId); // Add to the set of theoretically visible items.

      if (visibleItems.has(itemId)) continue; // If item is already visible, skip creation.
      if (activeItemId === itemId && isExpanded) continue; // If the item is currently expanded, don't recreate it.

      // Create a new item element.
      const item = document.createElement("div");
      item.className = "item";
      item.id = itemId;
      item.style.left = `${col * (itemWidth + itemGap)}px`;
      item.style.top = `${row * (itemHeight + itemGap)}px`;
      item.dataset.col = col;
      item.dataset.row = row;

      // Determine the image for the item.
      const itemNum = (Math.abs(row * columns + col) % itemCount) + 1;
      const img = document.createElement("img");
      img.src = `public/${itemNum}.jpeg`;
      img.alt = `Image ${itemNum}`;
      item.appendChild(img);

      // New items after initial load - animate in with rotateX and 400ms duration.
      if (initialAnimationDone && window.gsap) {
        gsap.fromTo(item, {
          opacity: 0,
          y: 64,
          scale: 1.5,
          rotateX: 40
        }, {
          opacity: 1,
          y: 0,
          scale: 1,
          rotateX: 0,
          duration: 0.4, // 400ms duration for individual items.
          ease: typeof CustomEase !== 'undefined' ? "hop" : "power2.out"
        });
      }

      // Add event listeners for new items (same as initial item creation).
      item.addEventListener("mouseenter", (e) => {
        if (!canDrag || isDragging || isExpanded) return;
        hoveredItem = item;
        if (window.gsap) {
          gsap.to(item, {
            scale: 1.2,
            duration: 0.3,
            ease: "power2.out"
          });
        }
      });

      item.addEventListener("mouseleave", (e) => {
        if (!canDrag || isDragging || isExpanded) return;
        if (hoveredItem === item) {
          hoveredItem = null;
        }
        if (window.gsap) {
          gsap.to(item, {
            scale: 1,
            duration: 0.3,
            ease: "power2.out"
          });
        }
      });

      item.addEventListener("click", (e) => {
        if (mouseHasMoved || isDragging) return;
        handleItemClick(item);
      });

      canvas.appendChild(item); // Add the new item to the canvas.
      visibleItems.add(itemId); // Add its ID to the visible items set.
    }
  }

  // Remove items that are no longer in the visible range.
  visibleItems.forEach((itemId) => {
    // If an item is not in the 'currentItems' set AND it's not the active expanded item, remove it.
    if (!currentItems.has(itemId) || (activeItemId === itemId && isExpanded)) {
      const item = document.getElementById(itemId);
      if (item && canvas.contains(item)) { // Ensure the item exists and is a child of canvas.
        canvas.removeChild(item); // Remove the item from the DOM.
      }
      visibleItems.delete(itemId); // Remove its ID from the visible items set.
    }
  });
}

// handleItemClick: Determines whether to expand or close an item based on current state.
function handleItemClick(item) {
  if (isExpanded) {
    if (expandedItem) closeExpandedItem(); // If an item is already expanded, close it.
  } else {
    expandItem(item); // If no item is expanded, expand the clicked one.
  }
}

// expandItem: Handles the animation and logic for expanding an item.
function expandItem(item) {
  if (!window.gsap) return; // Exit if GSAP is not available.

  isExpanded = true; // Set expanded flag.
  activeItem = item; // Store reference to the original item.
  activeItemId = item.id; // Store ID of the original item.
  canDrag = false; // Disable dragging.
  container.style.cursor = "auto"; // Change cursor.

  // Freeze panning values at current state and store mouse position.
  frozenPanX = panCurrentX;
  frozenPanY = panCurrentY;
  isPanningFrozen = true;
  lastMouseX = window.event ? window.event.clientX || 0 : 0;
  lastMouseY = window.event ? window.event.clientY || 0 : 0;

  // Reset panning targets (but keep current values frozen).
  panTargetX = 0;
  panTargetY = 0;
  if (panAnimation) {
    panAnimation.kill(); // Stop ongoing pan animation.
    panActive = false;
  }

  const imgSrc = item.querySelector("img").src;
  const imgMatch = imgSrc.match(/\/(\d+)\.jpeg/);
  const imgNum = imgMatch ? parseInt(imgMatch[1]) : 1;
  const titleIndex = (imgNum - 1) % items.length; // Determine the title for the expanded item.

  setAndAnimateTitle(items[titleIndex]); // Set and animate the project title.
  item.style.visibility = "hidden"; // Hide the original item.

  const rect = item.getBoundingClientRect(); // Get the position and size of the clicked item.
  const targetImg = item.querySelector("img").src;

  const itemLeft = parseFloat(item.style.left); // Get original left CSS value.
  const itemTop = parseFloat(item.style.top); // Get original top CSS value.

  // Store original position data for closing animation.
  originalPosition = {
    id: item.id,
    rect: rect,
    imgSrc: targetImg,
    originalScale: hoveredItem === item ? 1.2 : 1, // Account for hover scale.
    originalLeft: itemLeft,
    originalTop: itemTop
  };

  if (overlay) overlay.classList.add("active"); // Activate the overlay.

  // Create the expanded item element.
  expandedItem = document.createElement("div");
  expandedItem.className = "expanded-item";
  expandedItem.style.width = `${itemWidth}px`;
  expandedItem.style.height = `${itemHeight}px`;

  const img = document.createElement("img");
  img.src = targetImg;
  expandedItem.appendChild(img);
  expandedItem.addEventListener("click", closeExpandedItem); // Add click listener to close.
  document.body.appendChild(expandedItem); // Add to the document body.

  // Fade out and blur other visible items.
  document.querySelectorAll(".item").forEach((el) => {
    if (el !== activeItem) {
      gsap.to(el, {
        opacity: 0,
        filter: "blur(5px)",
        duration: 0.3,
        ease: "power2.out",
      });
    }
  });

  // Calculate target dimensions for the expanded item.
  const viewportHeight = window.innerHeight;
  const targetHeight = viewportHeight * 0.85; // 85% of viewport height.
  const aspectRatio = itemWidth / itemHeight;
  const targetWidth = targetHeight * aspectRatio;

  const startScale = originalPosition.originalScale; // Starting scale for animation.

  // Animate the expanded item from its original position/size to the target.
  gsap.fromTo(
    expandedItem, {
      width: itemWidth * startScale,
      height: itemHeight * startScale,
      // Calculate starting position relative to the center of the screen.
      x: rect.left + (itemWidth * startScale) / 2 - window.innerWidth / 2,
      y: rect.top + (itemHeight * startScale) / 2 - window.innerHeight / 2,
    }, {
      width: targetWidth,
      height: targetHeight,
      x: 0, // Animate to center of the screen (0,0 relative to centered origin).
      y: 0,
      duration: 1,
      ease: typeof CustomEase !== 'undefined' ? "hop" : "power2.out",
    }
  );

  gsap.delayedCall(0.5, animateTitleIn); // Animate title in after a delay.
}

// closeExpandedItem: Handles the animation and logic for closing an expanded item.
function closeExpandedItem() {
  if (!expandedItem || !originalPosition || !window.gsap) return; // Exit if no expanded item or GSAP.

  animateTitleOut(() => {}); // Animate the title out.

  gsap.delayedCall(0.3, () => { // Add a slight delay for smoother transition.
    if (overlay) overlay.classList.remove("active"); // Deactivate the overlay.

    // Get the current canvas transform to calculate the original item's screen position.
    const canvasTransform = canvas.style.transform;
    const transformMatch = canvasTransform.match(/translate\(([^,]+),\s*([^)]+)\)/);
    const canvasX = transformMatch ? parseFloat(transformMatch[1]) : 0;
    const canvasY = transformMatch ? parseFloat(transformMatch[2]) : 0;

    // Calculate the original item's position on the screen.
    const screenX = originalPosition.originalLeft + canvasX + itemWidth / 2;
    const screenY = originalPosition.originalTop + canvasY + itemHeight / 2;

    // Fade in and unblur other items.
    document.querySelectorAll(".item").forEach((el) => {
      if (el.id !== activeItemId) {
        gsap.to(el, {
          opacity: 1,
          filter: "blur(0px)",
          duration: 0.3,
          ease: "power2.out",
        });
      }
    });

    const originalItem = document.getElementById(activeItemId); // Get the original item element.

    // Animate the expanded item back to the original item's position and size.
    gsap.to(expandedItem, {
      width: itemWidth,
      height: itemHeight,
      // Calculate target position relative to expanded item's centered origin.
      x: screenX - window.innerWidth / 2,
      y: screenY - window.innerHeight / 2,
      duration: 1,
      ease: typeof CustomEase !== 'undefined' ? "hop" : "power2.out",
      onComplete: () => {
        // Cleanup after animation.
        if (expandedItem && expandedItem.parentNode) {
          document.body.removeChild(expandedItem); // Remove expanded item from DOM.
        }

        if (originalItem) {
          originalItem.style.visibility = "visible"; // Make original item visible again.
          gsap.set(originalItem, {
            scale: 1 // Reset scale of original item.
          });
        }

        // Reset title related elements.
        if (titleSplit) {
          titleSplit.revert();
        }
        if (projectTitleElem) {
          projectTitleElem.textContent = '';
          projectTitleElem.style.fontSize = '1em';
          projectTitleElem.style.overflow = 'visible';
        }

        // Reset state variables.
        expandedItem = null;
        isExpanded = false;
        activeItem = null;
        originalPosition = null;
        activeItemId = null;
        canDrag = true; // Re-enable dragging.
        container.style.cursor = "grab"; // Change cursor back.
        dragVelocityX = 0; // Reset drag velocities.
        dragVelocityY = 0;
        hoveredItem = null;
        isAnimatingTitle = false;

        // Set up for smooth panning reactivation: wait for mouse movement before unfreezing.
        waitingForMouseMove = true;
        panTargetX = 0;
        panTargetY = 0;
        // Update lastMouseX/Y to current mouse position to prevent immediate unfreeze if mouse is still.
        lastMouseX = window.event ? window.event.clientX || 0 : 0;
        lastMouseY = window.event ? window.event.clientY || 0 : 0;
      },
    });
  });
}

// handleScroll: Manages custom horizontal and vertical scrolling behavior using the mouse wheel.
function handleScroll(e) {
  // Prevent scrolling if dragging or an item is expanded to avoid conflicting interactions.
  if (!canDrag || isExpanded) return;

  e.preventDefault(); // Prevent the browser's default scroll behavior to implement custom scrolling.

  // Adjust scroll offsets based on the scroll delta and scrollSpeed.
  // deltaX handles horizontal scrolling (shift + scroll on most mice).
  // deltaY handles vertical scrolling.
  scrollOffsetX -= e.deltaX * scrollSpeed;
  scrollOffsetY -= e.deltaY * scrollSpeed;

  // Update targetX and targetY directly to incorporate the new scroll position.
  // This ensures the animate loop applies the scroll movement.
  targetX = scrollOffsetX;
  targetY = scrollOffsetY;
}

// animate: The main animation loop, continuously updates the canvas position.
function animate() {
  if (canDrag) {
    const ease = 0.075; // Easing factor for smooth canvas movement.
    currentX += (targetX - currentX) * ease; // Smoothly move currentX towards targetX.
    currentY += (targetY - currentY) * ease; // Smoothly move currentY towards targetY.

    // Calculate the final X and Y positions for the canvas transform.
    // If panning is frozen, use frozenPanX/Y; otherwise, use dynamic panCurrentX/Y.
    const finalX = currentX + (isPanningFrozen ? frozenPanX : panCurrentX);
    const finalY = currentY + (isPanningFrozen ? frozenPanY : panCurrentY);

    // Apply the calculated transform to the canvas.
    canvas.style.transform = `translate(${finalX}px, ${finalY}px)`;

    const now = Date.now();
    // Calculate distance moved to trigger updateVisibleItems efficiently.
    const distMoved = Math.sqrt(
      Math.pow(currentX - lastX, 2) + Math.pow(currentY - lastY, 2)
    );

    // Update visible items periodically or if a significant movement has occurred.
    if (distMoved > 100 || now - lastUpdateTime > 120) {
      updateVisibleItems();
      lastX = currentX; // Update last X for next distance calculation.
      lastY = currentY; // Update last Y for next distance calculation.
      lastUpdateTime = now; // Update last update time.
    }
  }

  requestAnimationFrame(animate); // Request the next animation frame, creating a loop.
}

// Start nav animation immediately.
initNavAnimation();

// INITIALIZE EVERYTHING IMMEDIATELY
createInitialItems(); // Create items instantly before any animations.
startLoadingAnimation(); // Start the initial animation for visible items as soon as possible.
animate(); // Start the main animation loop.

// Event listeners
// Listens for mouse movement to control the subtle panning effect.
window.addEventListener("mousemove", handleMousePan);
// Add wheel event listener for scrolling, with { passive: false } to allow preventDefault.
window.addEventListener("wheel", handleScroll, { passive: false });

// Event listener for mouse down (start of drag).
container.addEventListener("mousedown", (e) => {
  if (!canDrag) return; // Only start drag if dragging is allowed.
  isDragging = true; // Set dragging flag.
  mouseHasMoved = false; // Reset mouseHasMoved flag for this drag session.
  startX = e.clientX; // Record starting X position.
  startY = e.clientY; // Record starting Y position.
  container.style.cursor = "grabbing"; // Change cursor to indicate grabbing.
});

// Event listener for mouse move during a drag.
window.addEventListener("mousemove", (e) => {
  if (!isDragging || !canDrag) return; // Only process if dragging and allowed.

  const dx = e.clientX - startX; // Calculate change in X.
  const dy = e.clientY - startY; // Calculate change in Y.

  // If mouse has moved more than 5 pixels, set mouseHasMoved to true.
  if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
    mouseHasMoved = true;
  }

  const now = Date.now();
  const dt = Math.max(10, now - lastDragTime); // Calculate time difference, minimum 10ms.
  lastDragTime = now; // Update last drag time.

  dragVelocityX = dx / dt; // Calculate X velocity.
  dragVelocityY = dy / dt; // Calculate Y velocity.

  targetX += dx; // Update target X based on drag.
  targetY += dy; // Update target Y based on drag.

  startX = e.clientX; // Update starting X for next move calculation.
  startY = e.clientY; // Update starting Y for next move calculation.
});

// Event listener for mouse up (end of drag).
window.addEventListener("mouseup", (e) => {
  if (!isDragging) return; // Only process if dragging.
  isDragging = false; // Reset dragging flag.

  if (canDrag) {
    container.style.cursor = "grab"; // Change cursor back to grab.

    // Apply momentum based on last calculated velocity.
    if (Math.abs(dragVelocityX) > 0.1 || Math.abs(dragVelocityY) > 0.1) {
      const momentumFactor = 200; // Factor to apply to velocity for momentum.
      targetX += dragVelocityX * momentumFactor;
      targetY += dragVelocityY * momentumFactor;
    }
  }
});

// Event listener for touch start (mobile drag start).
container.addEventListener("touchstart", (e) => {
  if (!canDrag) return;
  isDragging = true;
  mouseHasMoved = false;
  startX = e.touches[0].clientX; // Get X from first touch.
  startY = e.touches[0].clientY; // Get Y from first touch.
  e.preventDefault(); // Prevent default touch behavior (like scrolling).
});

// Event listener for touch move (mobile drag).
window.addEventListener("touchmove", (e) => {
  if (!isDragging || !canDrag) return;

  const dx = e.touches[0].clientX - startX;
  const dy = e.touches[0].clientY - startY;

  if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
    mouseHasMoved = true;
  }

  targetX += dx;
  targetY += dy;

  startX = e.touches[0].clientX;
  startY = e.touches[0].clientY;
  e.preventDefault(); // Prevent default touch behavior.
});

// Event listener for touch end (mobile drag end).
window.addEventListener("touchend", () => {
  if (isDragging) {
    isDragging = false;
  }
});

// Event listener for window resize.
window.addEventListener("resize", () => {
  if (isExpanded && expandedItem && window.gsap) {
    // If an item is expanded, resize it gracefully on window resize.
    const viewportHeight = window.innerHeight;
    const targetHeight = viewportHeight * 0.7; // Recalculate target height.
    const aspectRatio = itemWidth / itemHeight;
    const targetWidth = targetHeight * aspectRatio; // Recalculate target width.

    gsap.to(expandedItem, {
      width: targetWidth,
      height: targetHeight,
      duration: 0.3,
      ease: "power2.out",
    });
  } else {
    updateVisibleItems(); // Otherwise, update visible items based on new window size.
  }
});