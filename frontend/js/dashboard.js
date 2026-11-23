async function loadDashboard() {
    const [customers, equipment, rentals, workorders, chartsData, woStatus, lowStock] = await Promise.all([
        fetch('/api/customers').then(r => r.json()),
        fetch('/api/equipment').then(r => r.json()),
        fetch('/api/rentals').then(r => r.json()),
        fetch('/api/workorders').then(r => r.json()),
        fetch('/api/charts/rentals-by-month').then(r => r.json()),
        fetch('/api/charts/workorders-status').then(r => r.json()),
        fetch('/api/charts/low-stock').then(r => r.json())
    ]);
    
    document.getElementById('mainContent').innerHTML = `
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:1rem;">
            <div class="card"><h3>Customers</h3><p style="font-size:2rem;">${customers.length}</p></div>
            <div class="card"><h3>Active Rentals</h3><p style="font-size:2rem;">${rentals.filter(r=>r.status==='active').length}</p></div>
            <div class="card"><h3>Equipment</h3><p style="font-size:2rem;">${equipment.length}</p></div>
            <div class="card"><h3>Open Work Orders</h3><p style="font-size:2rem;">${workorders.filter(w=>w.status!=='completed').length}</p></div>
        </div>
        <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:1rem;">
            <div class="card"><h3>📊 Rentals by Month</h3><canvas id="rentalsChart" height="200"></canvas></div>
            <div class="card"><h3>🔧 Work Orders Status</h3><canvas id="statusChart" height="200"></canvas></div>
        </div>
        <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:1rem;">
            <div class="card"><h3>💰 Monthly Revenue</h3><canvas id="revenueChart" height="200"></canvas></div>
            <div class="card"><h3>📦 Inventory Status</h3>
                <div style="text-align:center; padding:20px;">
                    <div style="font-size:3rem; color:${lowStock.low_stock > 0 ? '#c0392b' : '#27ae60'};">${lowStock.low_stock}</div>
                    <p>Low Stock Items</p>
                    <div style="margin-top:20px; background:#f0f2f5; border-radius:10px; height:20px;">
                        <div style="width:${(lowStock.low_stock / lowStock.total_parts) * 100}%; background:#e67e22; height:20px; border-radius:10px;"></div>
                    </div>
                    <p>${Math.round((lowStock.low_stock / lowStock.total_parts) * 100)}% of inventory is low</p>
                </div>
            </div>
        </div>
        <div class="card">
            <h2>Welcome to ProCoating</h2>
            <p><strong>24/7 Emergency Service:</strong> (787) 604-4347 | (787) 309-8738</p>
            <div style="margin-top:1rem;">
                <button class="btn" onclick="loadPage('rentals')">New Rental</button>
                <button class="btn btn-secondary" onclick="showNewWorkOrder()">New Work Order</button>
            </div>
        </div>
    `;
    
    if (charts.rentals) charts.rentals.destroy();
    if (charts.revenue) charts.revenue.destroy();
    if (charts.status) charts.status.destroy();
    
    charts.rentals = new Chart(document.getElementById('rentalsChart'), {
        type: 'bar',
        data: { labels: chartsData.months, datasets: [{ label: 'Number of Rentals', data: chartsData.rentals, backgroundColor: '#e67e22', borderRadius: 5 }] },
        options: { responsive: true, maintainAspectRatio: true }
    });
    
    charts.revenue = new Chart(document.getElementById('revenueChart'), {
        type: 'line',
        data: { labels: chartsData.months, datasets: [{ label: 'Revenue ($)', data: chartsData.revenue, borderColor: '#27ae60', backgroundColor: 'rgba(39, 174, 96, 0.1)', fill: true, tension: 0.4 }] },
        options: { responsive: true, maintainAspectRatio: true }
    });
    
    charts.status = new Chart(document.getElementById('statusChart'), {
        type: 'doughnut',
        data: { labels: woStatus.labels, datasets: [{ data: woStatus.data, backgroundColor: ['#e67e22', '#3498db', '#27ae60'] }] },
        options: { responsive: true, maintainAspectRatio: true }
    });
}
