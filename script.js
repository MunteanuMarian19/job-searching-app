// Global variables
let allJobs = [];
let currentPage = 1;
const PAGE_SIZE = 10;
let searchInterval = null;

// Function to start the searching animation modal
function startSearchingAnimation() {
  const searchModalEl = document.getElementById("searchModal");
  const searchModal = new bootstrap.Modal(searchModalEl);
  const searchTextEl = document.getElementById("search-text");
  searchTextEl.textContent = "Searching";
  let dotCount = 0;
  searchInterval = setInterval(() => {
    dotCount = (dotCount + 1) % 4; // cycles: 0, 1, 2, 3
    searchTextEl.textContent = "Searching" + ".".repeat(dotCount);
  }, 500);
  searchModal.show();
  return searchModal;
}

// Function to stop the searching animation
function stopSearchingAnimation(modalInstance) {
  clearInterval(searchInterval);
  modalInstance.hide();
}

// Helper to show results sections
function showResultsSections() {
  document.getElementById("results-summary").style.display = "block";
  document.getElementById("pagination-top").style.display = "block";
  document.getElementById("pagination-bottom").style.display = "block";
  // Since jobs are rendered in a Bootstrap row, change its display to block (the row's flex is provided by Bootstrap)
  document.getElementById("jobs-row").style.display = "flex";
}

// Error modal helper
function showErrorModal(message) {
  document.getElementById("errorModalBody").innerHTML = message;
  const errorModal = new bootstrap.Modal(document.getElementById("errorModal"));
  errorModal.show();
}

// Search form event listener
document
  .getElementById("job-search-form")
  .addEventListener("submit", async function (e) {
    e.preventDefault();
    const jobTitle = document.getElementById("job_title").value;
    const city = document.getElementById("city").value;
    const datePosted = document.getElementById("date_posted").value;
    const query = `${jobTitle} in ${city}`;
    console.log(
      "Searching for jobs with query:",
      query,
      "and date filter:",
      datePosted
    );
    currentPage = 1;
    const searchModalInstance = startSearchingAnimation();
    try {
      await searchJobs(query, datePosted);
    } finally {
      // This ensures the searching modal is closed regardless of success or error.
      stopSearchingAnimation(searchModalInstance);
    }
  });

// Fetch jobs from API (one call)
async function searchJobs(
  query,
  datePosted,
  page = 1,
  numPages = 10,
  country = "us"
) {
  const options = {
    method: "GET",
    url: "/.netlify/functions/jsearch-proxy", // use the Netlify function endpoint
    params: {
      query: query,
      page: page.toString(),
      num_pages: numPages.toString(),
      country: country,
      date_posted: datePosted,
    },
  };

  try {
    const response = await axios.request(options);
    console.log("API response:", response.data);
    allJobs = response.data.data || [];
    console.log("Total jobs fetched:", allJobs.length);

    if (allJobs.length === 0) {
      showErrorModal(
        "No jobs found for the selected criteria. Please adjust your search and try again."
      );
      return;
    }

    allJobs.sort(
      (a, b) =>
        (b.job_posted_at_timestamp || 0) - (a.job_posted_at_timestamp || 0)
    );
    showResultsSections();
    renderPage();
    renderPagination();
  } catch (error) {
    console.error("Error fetching jobs:", error);
    if (error.response && error.response.status === 429) {
      showErrorModal(
        "API limit reached. You have exceeded your API request quota. Please try again next month."
      );
    } else {
      showErrorModal("Error fetching jobs. Please try again later.");
    }
    document.getElementById("jobs-row").innerHTML =
      "<p>Error fetching jobs. Please try again later.</p>";
  }
}

// Render current page's job cards
function renderPage() {
  const jobsRow = document.getElementById("jobs-row");
  jobsRow.innerHTML = ""; // Clear previous results

  const start = (currentPage - 1) * PAGE_SIZE;
  const end = Math.min(start + PAGE_SIZE, allJobs.length);

  for (let i = start; i < end; i++) {
    const job = allJobs[i];
    console.log("Rendering job:", job);

    // Build the Description button.
    // (It stores the full description and apply options as data attributes.)
    const descButtonHTML = `<button class="btn btn-info description-btn" data-full-desc="${encodeURIComponent(
      job.job_description || ""
    )}" data-apply-options='${JSON.stringify(
      job.apply_options || []
    )}'>Description</button>`;

    // Build the Apply Options dropdown.
    let applyOptionsHTML = "";
    if (
      job.apply_options &&
      Array.isArray(job.apply_options) &&
      job.apply_options.length > 0
    ) {
      // Using an ordered list (<ol>) for numbering
      applyOptionsHTML = `<ol class="dropdown-menu">`;
      job.apply_options.forEach((option) => {
        if (option && option.publisher && option.apply_link) {
          applyOptionsHTML += `<li><a class="dropdown-item" href="${option.apply_link}" target="_blank">${option.publisher}</a></li>`;
        }
      });
      applyOptionsHTML += `</ol>`;
    } else {
      applyOptionsHTML = `<p class="dropdown-item">No Apply Options</p>`;
    }

    const jobCard = `
  <div class="card h-100">
    <div class="card-body d-flex flex-column gap-2">
      <h5 class="card-title">${job.job_title || "No Title"}</h5>
      ${
        job.employer_name
          ? `<p class="card-text"><strong>Employer:</strong> ${job.employer_name}</p>`
          : ""
      }
      ${
        job.job_employment_type
          ? `<p class="card-text"><strong>Employment Type:</strong> ${job.job_employment_type}</p>`
          : ""
      }
      ${
        job.job_location
          ? `<p class="card-text"><strong>Location:</strong> ${job.job_location}</p>`
          : job.job_city || job.job_country
          ? `<p class="card-text"><strong>Location:</strong> ${
              job.job_city || ""
            } ${job.job_country || ""}</p>`
          : ""
      }
      ${
        job.job_posted_at
          ? `<p class="card-text"><strong>Posted at:</strong> ${job.job_posted_at}</p>`
          : ""
      }
      
      <!-- Push buttons to the bottom -->
      <div class="mt-auto">
        <!-- Description button, full width -->
        <button 
          class="btn btn-info description-btn w-100" 
          data-full-desc="${encodeURIComponent(job.job_description || "")}"
          data-apply-options='${JSON.stringify(job.apply_options || [])}'
        >
          Description
        </button>
        <!-- Apply Options dropdown, full width -->
        <div class="dropdown mt-2">
          <button 
            class="btn btn-primary dropdown-toggle w-100" 
            type="button" 
            id="applyDropdown${i}" 
            data-bs-toggle="dropdown" 
            aria-expanded="false">
            Apply Options
          </button>
          <ol class="dropdown-menu w-100" aria-labelledby="applyDropdown${i}">
            ${
              job.apply_options &&
              Array.isArray(job.apply_options) &&
              job.apply_options.length > 0
                ? job.apply_options
                    .map((option) => {
                      if (option && option.publisher && option.apply_link)
                        return `<li><a class="dropdown-item" href="${option.apply_link}" target="_blank">${option.publisher}</a></li>`;
                      else return "";
                    })
                    .join("")
                : `<li><span class="dropdown-item">No Options</span></li>`
            }
          </ol>
        </div>
      </div>
    </div>
  </div>
`;

    // Wrap the job card in a Bootstrap grid column.
    const colDiv = document.createElement("div");
    colDiv.className = "col-12 col-sm-6 col-md-4 col-lg-3";
    colDiv.innerHTML = jobCard;
    jobsRow.appendChild(colDiv);
  }

  // Attach event listener for Description buttons (to open the full description modal)
  document.querySelectorAll(".description-btn").forEach((btn) => {
    btn.addEventListener("click", function (e) {
      e.preventDefault();
      let fullDesc = decodeURIComponent(this.getAttribute("data-full-desc"));
      // Format full description: add line breaks after punctuation and bullet points.
      fullDesc = fullDesc.replace(/([.?!])\s+/g, "$1<br><br>");
      fullDesc = fullDesc.replace(/•\s*/g, "<br>• ");
      // Retrieve apply options from the data attribute (as JSON)
      let applyOptions = [];
      try {
        applyOptions = JSON.parse(this.getAttribute("data-apply-options"));
      } catch (err) {
        console.error("Error parsing apply options:", err);
      }
      let applyDropdownHtml = "";
      if (applyOptions.length > 0) {
        applyDropdownHtml = `<ol class="dropdown-menu">`;
        applyOptions.forEach((option) => {
          if (option && option.publisher && option.apply_link) {
            applyDropdownHtml += `<li><a class="dropdown-item" href="${option.apply_link}" target="_blank">${option.publisher}</a></li>`;
          }
        });
        applyDropdownHtml += `</ol>`;
      } else {
        applyDropdownHtml = `<p>No Apply Options</p>`;
      }

      document.getElementById("modal-description-body").innerHTML = `
  ${fullDesc}<br><br>
  <div class="dropdown">
    <button class="btn btn-primary dropdown-toggle w-100 text-center" type="button" id="modalApplyDropdown" data-bs-toggle="dropdown" aria-expanded="false">
      Apply Options
    </button>
    <ol class="dropdown-menu w-100 text-center" aria-labelledby="modalApplyDropdown">
      ${
        applyOptions.length > 0
          ? applyOptions
              .map((option) => {
                if (option && option.publisher && option.apply_link)
                  return `<li><a class="dropdown-item" href="${option.apply_link}" target="_blank">${option.publisher}</a></li>`;
                else return "";
              })
              .join("")
          : `<li><span class="dropdown-item">No Apply Options</span></li>`
      }
    </ol>
  </div>
`;

      const modal = new bootstrap.Modal(
        document.getElementById("descriptionModal")
      );
      modal.show();
    });
  });

  // Attach event listener for any remaining apply buttons (if needed)
  document.querySelectorAll(".apply-btn").forEach((btn) => {
    btn.addEventListener("click", function () {
      const url = this.getAttribute("data-url");
      if (url) {
        window.open(url, "_blank");
      }
    });
  });

  updateResultsSummary();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function updateResultsSummary() {
  const summaryElement = document.getElementById("results-summary");
  const totalPages = Math.ceil(allJobs.length / PAGE_SIZE);
  if (summaryElement) {
    summaryElement.textContent = `Page ${currentPage} of ${totalPages}`;
  }
}

function renderPagination() {
  const totalPages = Math.ceil(allJobs.length / PAGE_SIZE);
  const paginationTop = document.getElementById("pagination-top");
  const paginationBottom = document.getElementById("pagination-bottom");

  function createPaginationControls() {
    const container = document.createElement("div");
    container.className = "d-flex justify-content-center";
    const prevBtn = document.createElement("button");
    prevBtn.textContent = "Previous";
    prevBtn.className = "btn btn-secondary me-2";
    prevBtn.disabled = currentPage === 1;
    prevBtn.addEventListener("click", () => {
      if (currentPage > 1) {
        currentPage--;
        renderPage();
        renderPagination();
      }
    });
    container.appendChild(prevBtn);
    const nextBtn = document.createElement("button");
    nextBtn.textContent = "Next";
    nextBtn.className = "btn btn-secondary";
    nextBtn.disabled = currentPage === totalPages;
    nextBtn.addEventListener("click", () => {
      if (currentPage < totalPages) {
        currentPage++;
        renderPage();
        renderPagination();
      }
    });
    container.appendChild(nextBtn);
    return container;
  }

  paginationTop.innerHTML = "";
  paginationBottom.innerHTML = "";
  paginationTop.appendChild(createPaginationControls());
  paginationBottom.appendChild(createPaginationControls());
}

document.addEventListener("DOMContentLoaded", function () {
  const descriptionModalEl = document.getElementById("descriptionModal");
  descriptionModalEl.addEventListener("hidden.bs.modal", function () {
    if (descriptionModalEl.contains(document.activeElement)) {
      document.activeElement.blur();
    }
  });
});
