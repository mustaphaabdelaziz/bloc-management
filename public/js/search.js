/**
 * Generic search/filter functionality for list tables
 * Usage: Call initializeSearch(tableId, searchInputId, columnsToSearch)
 */

function initializeSearch(tableId, searchInputId, columnsToSearch = []) {
  const searchInput = document.getElementById(searchInputId);
  const table = document.getElementById(tableId);

  if (!searchInput || !table) {
    console.warn(
      `Search initialization failed: tableId="${tableId}" or searchInputId="${searchInputId}" not found`
    );
    return;
  }

  const rows = table.getElementsByTagName("tbody")[0].getElementsByTagName("tr");
  let debounceTimer;

  searchInput.addEventListener("keyup", function () {
    clearTimeout(debounceTimer);

    debounceTimer = setTimeout(() => {
      const searchTerm = searchInput.value.toLowerCase().trim();
      let visibleCount = 0;

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const cells = row.getElementsByTagName("td");
        let matchFound = false;

        // If no specific columns provided, search all cells
        if (columnsToSearch.length === 0) {
          for (let j = 0; j < cells.length - 1; j++) {
            // Exclude actions column
            if (
              cells[j].textContent.toLowerCase().includes(searchTerm) ||
              cells[j].innerText.toLowerCase().includes(searchTerm)
            ) {
              matchFound = true;
              break;
            }
          }
        } else {
          // Search only specified columns
          for (let columnIndex of columnsToSearch) {
            if (
              columnIndex < cells.length &&
              (cells[columnIndex].textContent
                .toLowerCase()
                .includes(searchTerm) ||
                cells[columnIndex].innerText
                  .toLowerCase()
                  .includes(searchTerm))
            ) {
              matchFound = true;
              break;
            }
          }
        }

        if (searchTerm === "" || matchFound) {
          row.style.display = "";
          visibleCount++;
        } else {
          row.style.display = "none";
        }
      }

      // Update result count
      updateSearchResultCount(visibleCount, rows.length);
    }, 300); // Debounce delay
  });
}

/**
 * Update the search result count display
 */
function updateSearchResultCount(visibleCount, totalCount) {
  let resultElement = document.getElementById("searchResultCount");

  if (!resultElement) {
    // Create result element if it doesn't exist
    const searchContainer = document.querySelector(".search-container");
    if (searchContainer) {
      resultElement = document.createElement("div");
      resultElement.id = "searchResultCount";
      resultElement.className = "search-result-count";
      searchContainer.parentElement.insertBefore(
        resultElement,
        searchContainer.nextSibling
      );
    }
  }

  if (resultElement) {
    if (visibleCount === totalCount) {
      resultElement.style.display = "none";
    } else {
      resultElement.innerHTML = `<strong>${visibleCount}</strong> résultat(s) trouvé(s) sur ${totalCount}`;
      resultElement.style.display = "inline-flex";
    }
  }
}

/**
 * Clear search input and reset table
 */
function clearSearch(searchInputId) {
  const searchInput = document.getElementById(searchInputId);
  if (searchInput) {
    searchInput.value = "";
    searchInput.dispatchEvent(new Event("keyup"));
  }
}
