let socket;
let reconnectInterval;
let latencyDiv = document.getElementById("latency");
let isConnected = document.getElementById("isConnected");
let connectBtn = document.getElementById("connectBtn")
let disconnectBtn = document.getElementById("disconnectBtn")
let scanBtn = document.getElementById("scanBtn")
const cameraTableBody = document.getElementById("cameraTableBody");
let cameraInfoDiv = document.getElementById("cameraInfoDisplay");
let iapiBtn = document.getElementById("iapiBtn");
document.referrerPolicy = "no-referrer";
const host_url = "172.25.6.235:8000"

// -----------------Connect to WebSocket-------------------
function connect() {
    if (socket && socket.readyState === WebSocket.OPEN) {
        isConnected.innerHTML = 'WebSocket is already connected.';
        return
    }
    socket = new WebSocket(`ws://${host_url}/ws`);

    socket.onopen = function () {
        // Clear any existing rows in the table before adding new results
        isConnected.innerHTML = 'WebSocket is open now.';
        connectBtn.disabled = true;
        disconnectBtn.disabled = false;
        scanBtn.disabled = false;
        clearInterval(reconnectInterval); // Stop reconnect attempts
    };

    socket.onmessage = function (event) {
        isConnected.innerHTML = '';
        const data = JSON.parse(event.data);
        if (data["error"]) {
            handleError(data["error"])
        }
        if (data["latency"]) {
            displayLatency(data)
        }
        if (data["subnet_latency"]) {
            displaySubnets(data)
        }
        if (data["camera"]) {
            displayCameraData(data);
        }
        if (data["cameraInfo"]) {
            displayAdditionalCameraInfo(data.host, data.cameraInfo);
        }
        if (data["iAPIcameraInfo"]) {
            displayCameraInfoURL(data.host, data.iAPIcameraInfo);
        }
    };

    socket.onclose = function () {
        isConnected.innerHTML = 'WebSocket is closed.';
        // reconnect();
    };

    socket.onerror = function (error) {
        console.error("WebSocket error:", error);
    };
}

function disconnect() {
    if (!socket) {
        isConnected.innerHTML = 'WebSocket is not connected.';
        return
    }
    if (socket.readyState === WebSocket.OPEN) {
        socket.close()
        disconnectBtn.disabled = true;
        scanBtn.disabled = true;
        connectBtn.disabled = false;
        isConnected.innerHTML = 'WebSocket is disconnected.';
    }
}
// Try to reconnect every 5 seconds if the connection is closed
function reconnect() {
    reconnectInterval = setInterval(function () {
        connect();
    }, 5000);
}

// Send scan request to WebSocket
function scanSubnet() {
    if (!socket) {
        isConnected.innerHTML = 'WebSocket is not connected.';
        return
    }
    if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
            "action": "nmap_scan"
        }));
        cameraTableBody.innerHTML = '';
        latencyDiv.innerHTML = '';
        isConnected.innerHTML = 'scanning...';
    } else {
        isConnected.innerHTML = 'WebSocket is not connected.';
    }
}


function displayLatency(data) {
    // Create and append latency info
    const latency = document.createElement("h4");
    latency.textContent = `Camera scan latency: ${parseFloat(data.latency).toFixed(3)}s \t `;
    latency.style.color = "#333";  // Add some styling to latency text
    latency.style.marginBottom = "10px";  // Add some space
    latencyDiv.appendChild(latency);
}

function displaySubnets(data) {
    latencyDiv.innerHTML = '';
    const subnet_latency = document.createElement("h4");
    subnet_latency.textContent = `Alive Subnet discover latency: ${parseFloat(data.subnet_latency).toFixed(3)}s`;
    subnet_latency.style.color = "#333";  // Add some styling to subnet_latency text
    subnet_latency.style.marginBottom = "10px";  // Add some space
    latencyDiv.appendChild(subnet_latency);

    // Create and append Alive Subnets header
    const subnetH3 = document.createElement("h3");
    subnetH3.textContent = `Alive Subnets`;
    subnetH3.style.color = "#2c3e50";  // Styling header
    subnetH3.style.marginBottom = "10px";  // Spacing below header
    latencyDiv.appendChild(subnetH3);

    // Create the subnet list with flexbox styling
    const subnetList = document.createElement("ul");
    subnetList.style.display = "flex";
    subnetList.style.flexWrap = "wrap";
    subnetList.style.listStyle = "none";
    subnetList.style.padding = "0";
    subnetList.style.margin = "0";

    aliveSubnets = data.alive_subnets;

    aliveSubnets.forEach(subnet => {
        // Create list item for each subnet
        const listItem = document.createElement("li");
        listItem.textContent = subnet;
        listItem.style.border = "1px solid #ddd";  // Add borders
        listItem.style.padding = "5px";  // Padding inside each item
        listItem.style.margin = "5px";  // Space between items
        listItem.style.borderRadius = "5px";  // Rounded corners
        listItem.style.backgroundColor = "#f5f5f5";  // Light background
        listItem.style.flex = "1 0 10%";  // Flex items for responsiveness
        listItem.style.textAlign = "center";  // Center text
        listItem.style.color = "#34495e";  // Text color

        // Append each list item to the subnet list
        subnetList.appendChild(listItem);
    });

    // Append the list to the latencyDiv
    latencyDiv.appendChild(subnetList);
    latencyDiv.appendChild(document.createElement("hr"));

}

function handleError(error) {
    cameraInfoDiv.innerHTML = "";
    cameraInfoDiv.style.visibility = "visible";
    const errDiv = document.createElement("div");
    errDiv.textContent = error;
    errDiv.style.border = "1px solid #ddd";  // Add borders
    errDiv.style.padding = "5px";  // Padding inside each item
    errDiv.style.margin = "5px";  // Space between items
    errDiv.style.borderRadius = "5px";  // Rounded corners
    errDiv.style.backgroundColor = "#f5f5f5";  // Light background
    errDiv.style.flex = "1 0 100%";  // Flex items for responsiveness
    errDiv.style.textAlign = "center";  // Center text
    errDiv.style.color = "red";  // Text color

    cameraInfoDiv.appendChild(errDiv);
}

// --------------Table----------------
let currentPage = 1;
const rowsPerPage = 10;
function displayCameraData(camera_data) {
    const camera = camera_data.camera;

    // Ensure table and pagination controls are visible
    const cameraTable = document.getElementById("cameraTable");
    const paginationControls = document.getElementById("paginationControls");
    const search = document.getElementById("searchIp")

    cameraTable.style.visibility = "visible";  // Make the table visible
    search.style.visibility = "visible";  // Make the table visible
    paginationControls.style.display = "block";  // Show pagination controls

    // Create a new row for each camera's data
    const row = document.createElement("tr");

    // Host cell
    const hostCell = document.createElement("td");
    hostCell.innerHTML = `<strong>${camera.host}</strong>`;
    row.appendChild(hostCell);

    // Ports cell
    const portsCell = document.createElement("td");
    portsCell.textContent = camera.ports.join(', ');  // Joining ports array
    row.appendChild(portsCell);

    // Services cell
    const servicesCell = document.createElement("td");
    servicesCell.textContent = camera.services.join(', ');  // Joining services array
    row.appendChild(servicesCell);

    // Username input field
    const usernameCell = document.createElement("td");
    const usernameInput = document.createElement("input");
    usernameInput.type = "text";
    usernameInput.placeholder = "Username";
    usernameInput.id = `username-${camera.host}`;  // Unique ID for each camera
    usernameCell.appendChild(usernameInput);
    row.appendChild(usernameCell);

    // Password input field
    const passwordCell = document.createElement("td");
    const passwordInput = document.createElement("input");
    passwordInput.type = "password";
    passwordInput.placeholder = "Password";
    passwordInput.id = `password-${camera.host}`;  // Unique ID for each camera
    passwordCell.appendChild(passwordInput);
    row.appendChild(passwordCell);

    // Action button to submit username and password
    const actionCell = document.createElement("td");
    const submitButton = document.createElement("button");
    submitButton.textContent = "Submit";
    submitButton.onclick = function () {
        const username = document.getElementById(`username-${camera.host}`).value;
        const password = document.getElementById(`password-${camera.host}`).value;

        // Call API function with the retrieved username and password
        getIAPIInfo(camera.host, username, password);
    };
    actionCell.appendChild(submitButton);
    row.appendChild(actionCell);

    // Append the row to the table body

    cameraTableBody.appendChild(row);

    // Apply pagination after new data is added
    applyPagination();
}

function applyPagination() {
    const table = document.getElementById("cameraTableBody");

    if (!table) {
        console.error("cameraTableBody is null");
        return;
    }

    const rows = table.getElementsByTagName("tr");
    const totalRows = rows.length;
    const totalPages = Math.ceil(totalRows / rowsPerPage);

    if (totalRows === 0) {
        return;  // No rows to paginate
    }

    // Hide all rows
    for (let i = 0; i < totalRows; i++) {
        rows[i].style.display = "none";
    }

    // Display only the rows for the current page
    const start = (currentPage - 1) * rowsPerPage;
    const end = Math.min(start + rowsPerPage, totalRows);
    for (let i = start; i < end; i++) {
        rows[i].style.display = "";
    }

    // Update pagination controls
    document.getElementById("pageIndicator").textContent = `Page ${currentPage} of ${totalPages}`;

    document.getElementById("prevPage").disabled = currentPage === 1;
    document.getElementById("nextPage").disabled = currentPage === totalPages;
}

function nextPage() {
    currentPage++;
    applyPagination();
}

function prevPage() {
    currentPage--;
    applyPagination();
}

// applyPagination();


function sortTable(n) {
    var table, rows, switching, i, x, y, shouldSwitch, dir, switchcount = 0;
    table = document.getElementById("cameraTable");
    switching = true;
    // Set the sorting direction to ascending:
    dir = "asc";
    /* Make a loop that will continue until
    no switching has been done: */
    while (switching) {
        // Start by saying: no switching is done:
        switching = false;
        rows = table.rows;
        /* Loop through all table rows (except the
        first, which contains table headers): */
        for (i = 1; i < (rows.length - 1); i++) {
            // Start by saying there should be no switching:
            shouldSwitch = false;
            /* Get the two elements you want to compare,
            one from current row and one from the next: */
            x = rows[i].getElementsByTagName("TD")[n];
            y = rows[i + 1].getElementsByTagName("TD")[n];
            /* Check if the two rows should switch place,
            based on the direction, asc or desc: */
            if (dir == "asc") {
                if (x.innerHTML.toLowerCase() > y.innerHTML.toLowerCase()) {
                    // If so, mark as a switch and break the loop:
                    shouldSwitch = true;
                    break;
                }
            } else if (dir == "desc") {
                if (x.innerHTML.toLowerCase() < y.innerHTML.toLowerCase()) {
                    // If so, mark as a switch and break the loop:
                    shouldSwitch = true;
                    break;
                }
            }
        }
        if (shouldSwitch) {
            /* If a switch has been marked, make the switch
            and mark that a switch has been done: */
            rows[i].parentNode.insertBefore(rows[i + 1], rows[i]);
            switching = true;
            // Each time a switch is done, increase this count by 1:
            switchcount++;
        } else {
            /* If no switching has been done AND the direction is "asc",
            set the direction to "desc" and run the while loop again. */
            if (switchcount == 0 && dir == "asc") {
                dir = "desc";
                switching = true;
            }
        }
    }
}

function searchTable() {
    var input, filter, table, tr, td, i, txtValue;
    input = document.getElementById("searchIp");
    filter = input.value.toUpperCase();
    table = document.getElementById("cameraTable");
    tr = table.getElementsByTagName("tr");
    for (i = 0; i < tr.length; i++) {
        td = tr[i].getElementsByTagName("td")[0];
        if (td) {
            txtValue = td.textContent || td.innerText;
            if (txtValue.toUpperCase().indexOf(filter) > -1) {
                tr[i].style.display = "";
            } else {
                tr[i].style.display = "none";
            }
        }
    }
}





function getMoreCameraONVIFInfo(host, username, password) {
    if (socket.readyState === WebSocket.OPEN) {
        // Send camera info request via WebSocket
        socket.send(JSON.stringify({
            action: 'get_onvif_info',
            host: host,
            username: username,
            password: password
        }));
    } else {
        console.error('WebSocket connection is not open.');
        handleError("'WebSocket connection is not open.'")
    }
}

function displayAdditionalCameraInfo(host, data) {
    // Clear any previous content
    cameraInfoDiv.innerHTML = "";


    // Create new content
    const infoHeader = document.createElement("h3");
    infoHeader.textContent = `Additional Information for Camera: ${host}`;
    cameraInfoDiv.appendChild(infoHeader);

    const infoContent = document.createElement("p");
    infoContent.innerHTML = `
        <strong>Manufacturer:</strong> ${data.Manufacturer}<br>
        <strong>Model:</strong> ${data.Model}<br>
        <strong>Firmware Version:</strong> ${data.FirmwareVersion}<br>
        <strong>Serial Number:</strong> ${data.SerialNumber}<br>
        <strong>Hardware ID:</strong> ${data.HardwareId}<br>
    `;
    cameraInfoDiv.appendChild(infoContent);
}

function getIAPIInfo(host, username, password) {
    if (socket.readyState === WebSocket.OPEN) {
        // Send camera info request via WebSocket
        request = {
            action: 'get_iapi_info',
            host: host,
            username: username,
            password: password
        }
        socket.send(JSON.stringify(request));
    } else {
        console.error('WebSocket connection is not open.');
        handleError("'WebSocket connection is not open.'")
    }
};
function displayCameraInfoURL(host, data) {
    cameraInfoDiv.innerHTML = "";
    cameraInfoDiv.style.visibility = "visible";

    // Create new content
    const infoHeader = document.createElement("h3");
    infoHeader.textContent = `Additional Information for Camera: ${host}`;
    infoHeader.classList.add("info-header"); // Add a CSS class to the header
    cameraInfoDiv.appendChild(infoHeader);

    const table = document.createElement("table");
    table.classList.add("info-table"); // Add a CSS class to the table
    table.innerHTML = `
        <tr>
            <td><strong>Manufacturer</strong></td>
            <td>${data["System.ManufacturedDate"]}</td>
        </tr>
        <tr>
            <td><strong>Model</strong></td>
            <td>${data["System.ModelName"]}</td>
        </tr>
        <tr>
            <td><strong>Firmware Version</strong></td>
            <td>${data["System.Version.Firmware"]}</td>
        </tr>
        <tr>
            <td><strong>Serial Number</strong></td>
            <td>${data["System.SerialNumber"]}</td>
        </tr>
        <tr>
            <td><strong>Display Name</strong></td>
            <td>${data["System.FriendlyName"]}</td>
        </tr>
        <tr>
            <td><strong>Hostname</strong></td>
            <td>${data["System.Hostname"]}</td>
        </tr>
        <tr>
            <td><strong>ProductCode</strong></td>
            <td>${data["System.ProductCode"]}</td>
        </tr>
        <tr>
            <td><strong>MacAddress</strong></td>
            <td>${data["Network.MacAddress"]}</td>
        </tr>
    `;
    cameraInfoDiv.appendChild(table);
}
