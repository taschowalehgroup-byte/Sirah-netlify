/* ═══════════════════════════════════════════════════════
   DentCare Pro — Analytics Page
   ═══════════════════════════════════════════════════════ */

let _anRevChart = null, _anDonutChart = null, _anDrChart = null, _anDrRevChart = null;
/* Store monthly arrays for 3D bar chart toggling */
let _an3dRevData = Array(12).fill(0);
let _an3dExpData = Array(12).fill(0);

function BarChart3D_switchRevenue() {
  document.getElementById('bar3dBtnRev')?.classList.add('active');
  document.getElementById('bar3dBtnExp')?.classList.remove('active');
  if (typeof BarChart3D !== 'undefined') {
    BarChart3D.mount('bar3dMount', {
      labels: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
      values: _an3dRevData,
      color: 0x00d4ff
    });
  }
}
function BarChart3D_switchExpense() {
  document.getElementById('bar3dBtnRev')?.classList.remove('active');
  document.getElementById('bar3dBtnExp')?.classList.add('active');
  if (typeof BarChart3D !== 'undefined') {
    BarChart3D.mount('bar3dMount', {
      labels: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
      values: _an3dExpData,
      color: 0xff4466
    });
  }
}

const AnalyticsPage = {
  async render() {
    try {
      const [tx, patients, doctors, appts] = await Promise.all([
        DB.tables.transactions.all(),
        DB.tables.patients.all(),
        DB.tables.doctors.all(),
        DB.tables.appointments.all()
      ]);

      const income  = tx.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0);
      const expense = tx.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0);

      /* ── KPI Row ───────────────────────────────────── */
      const kpis = [
        { label:'Total Revenue',   value:`E£${fmt(income)}`,          icon:'💰', c:'var(--accent)' },
        { label:'Total Expenses',  value:`E£${fmt(expense)}`,         icon:'📉', c:'var(--red)' },
        { label:'Net Profit',      value:`E£${fmt(income-expense)}`,  icon:'📈', c:'var(--green)' },
        { label:'Total Patients',  value:patients.length,             icon:'👥', c:'var(--accent2)' },
        { label:'Total Appts',     value:appts.length,                icon:'📅', c:'var(--yellow)' },
      ];
      $('anKpiGrid').innerHTML = kpis.map((k,i)=>`
        <div class="an-kpi-card" style="--i:${i};--c:${k.c}">
          <div class="ankpi-icon">${k.icon}</div>
          <div class="ankpi-val" style="color:${k.c}">${k.value}</div>
          <div class="ankpi-label">${k.label}</div>
        </div>
      `).join('');

      /* ── Revenue vs Expenses line chart ───────────── */
      const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      const revM = Array(12).fill(0), expM = Array(12).fill(0);
      tx.forEach(t => {
        const m = new Date(t.date||t.created_at||0).getMonth();
        if (m<0||m>11) return;
        if (t.type==='income')  revM[m] += t.amount;
        if (t.type==='expense') expM[m] += t.amount;
      });

      /* store for toggle buttons */
      _an3dRevData = revM;
      _an3dExpData = expM;

      /* mount 3D bar chart (revenue by default) */
      if (typeof BarChart3D !== 'undefined') {
        requestAnimationFrame(() => {
          BarChart3D.mount('bar3dMount', { labels: months, values: revM, color: 0x00d4ff });
        });
      }

      if (_anRevChart) { _anRevChart.destroy(); _anRevChart = null; }
      const c1 = document.getElementById('anRevenueChart');
      if (c1) {
        _anRevChart = new Chart(c1, {
          type: 'line',
          data: {
            labels: months,
            datasets: [
              {
                label: 'Revenue',
                data: revM,
                borderColor:'#00d4ff', backgroundColor:'rgba(0,212,255,0.06)',
                borderWidth:2.5, pointRadius:4, pointBackgroundColor:'#00d4ff',
                tension:0.4, fill:true
              },
              {
                label: 'Expenses',
                data: expM,
                borderColor:'#ff4466', backgroundColor:'rgba(255,68,102,0.06)',
                borderWidth:2.5, pointRadius:4, pointBackgroundColor:'#ff4466',
                tension:0.4, fill:true
              }
            ]
          },
          options: {
            responsive:true,
            plugins: {
              legend:{
                labels:{ color:'#e8eaf6', font:{size:12}, boxWidth:14, usePointStyle:true }
              }
            },
            scales: {
              x:{ grid:{color:'rgba(255,255,255,0.04)'}, ticks:{color:'#7b84a3',font:{size:11}} },
              y:{
                grid:{color:'rgba(255,255,255,0.04)'},
                ticks:{ color:'#7b84a3', font:{size:11}, callback:v=>'E£'+(v>=1000?(v/1000).toFixed(0)+'k':v) }
              }
            }
          }
        });
      }

      /* ── Treatment Distribution donut ─────────────── */
      const treatTypes = ['filling','crown','root_canal','extraction','cleaning','implant','orthodontics','other'];
      const treatLabels = ['Filling','Crown','Root Canal','Extraction','Cleaning','Implant','Orthodontics','Other'];
      const treatCounts = treatTypes.map(t =>
        appts.filter(a => (a.treatment_type||'').toLowerCase().includes(t)).length
      );
      const donutColors = ['#00d4ff','#b388ff','#ff8c42','#ff4466','#06d6a0','#ffd166','#4fc3f7','#7b84a3'];

      if (_anDonutChart) { _anDonutChart.destroy(); _anDonutChart = null; }
      const c2 = document.getElementById('anDonutChart');
      if (c2) {
        _anDonutChart = new Chart(c2, {
          type: 'doughnut',
          data: {
            labels: treatLabels,
            datasets:[{
              data: treatCounts.map(v=>v||1),
              backgroundColor: donutColors,
              borderColor:'transparent',
              hoverOffset:6
            }]
          },
          options: {
            responsive:true,
            cutout:'62%',
            plugins:{
              legend:{
                position:'top',
                labels:{ color:'#e8eaf6', font:{size:11}, boxWidth:12, padding:10, usePointStyle:true }
              }
            }
          }
        });
      }

      /* ── Doctor Performance — Patients bar chart ──── */
      const drNames  = doctors.map(d => d.full_name.replace('Dr. ',''));
      const drPtCounts = doctors.map(d => appts.filter(a=>a.doctor_id===d.id).length);

      if (_anDrChart) { _anDrChart.destroy(); _anDrChart = null; }
      const c3 = document.getElementById('anDoctorChart');
      if (c3) {
        _anDrChart = new Chart(c3, {
          type:'bar',
          data:{
            labels: drNames,
            datasets:[{
              label:'Patients Seen',
              data: drPtCounts,
              backgroundColor:'rgba(0,212,255,0.55)',
              borderColor:'#00d4ff',
              borderWidth:1,
              borderRadius:6,
              hoverBackgroundColor:'rgba(0,212,255,0.8)'
            }]
          },
          options:{
            responsive:true,
            plugins:{ legend:{display:false} },
            scales:{
              x:{ grid:{display:false}, ticks:{color:'#7b84a3',font:{size:12}} },
              y:{ grid:{color:'rgba(255,255,255,0.04)'}, ticks:{color:'#7b84a3',font:{size:11}} }
            }
          }
        });
      }

      /* ── Doctor Performance — Revenue bar chart ───── */
      const drRevenue = doctors.map(d => {
        return appts
          .filter(a => a.doctor_id===d.id)
          .reduce((sum,a) => {
            const t = tx.find(t => t.appointment_id===a.id && t.type==='income');
            return sum + (t ? t.amount : 0);
          }, 0);
      });

      if (_anDrRevChart) { _anDrRevChart.destroy(); _anDrRevChart = null; }
      const c4 = document.getElementById('anDoctorRevChart');
      if (c4) {
        _anDrRevChart = new Chart(c4, {
          type:'bar',
          data:{
            labels: drNames,
            datasets:[{
              label:'Revenue (E£)',
              data: drRevenue,
              backgroundColor:'rgba(0,255,179,0.5)',
              borderColor:'#00ffb3',
              borderWidth:1,
              borderRadius:6,
              hoverBackgroundColor:'rgba(0,255,179,0.75)'
            }]
          },
          options:{
            responsive:true,
            plugins:{ legend:{display:false} },
            scales:{
              x:{ grid:{display:false}, ticks:{color:'#7b84a3',font:{size:12}} },
              y:{
                grid:{color:'rgba(255,255,255,0.04)'},
                ticks:{ color:'#7b84a3', font:{size:11}, callback:v=>'E£'+(v>=1000?(v/1000).toFixed(0)+'k':v) }
              }
            }
          }
        });
      }

    } catch(e) {
      console.error('Analytics error:', e);
      toast('Failed to load analytics', 'error');
    }
  }
};

/* ── Feedback analytics (appended to AnalyticsPage) ── */
let _anFbChart = null, _anSatChart = null, _anRadarChart = null;

const AnalyticsFeedback = {
  async render() {
    try {
      const data = { summary: [], overall: {} };
      const { summary = [], overall = {} } = data;

      /* KPI total badge */
      const tot = document.getElementById('anFeedbackTotal');
      if (tot) tot.textContent = `${overall.total || 0} reviews · avg ${overall.avg_overall ? overall.avg_overall.toFixed(1) : '—'} ★`;

      /* ── Bar chart: per-doctor average ratings ── */
      const labels     = summary.map(d => (d.doctor_name||'').replace('Dr. ',''));
      const avgOverall = summary.map(d => d.avg_overall || 0);
      const avgWait    = summary.map(d => d.avg_wait || 0);
      const avgDrTime  = summary.map(d => d.avg_doctor_time || 0);
      const avgClean   = summary.map(d => d.avg_clean || 0);
      const glassPlugin = { color:'rgba(160,180,220,0.18)' };

      if (_anFbChart) { _anFbChart.destroy(); _anFbChart = null; }
      const c5 = document.getElementById('anFeedbackChart');
      if (c5 && summary.length) {
        _anFbChart = new Chart(c5, {
          type: 'bar',
          data: {
            labels,
            datasets: [
              { label:'Overall',    data:avgOverall, backgroundColor:'rgba(245,200,66,0.65)', borderColor:'#f5c842', borderWidth:1.5, borderRadius:6 },
              { label:'Wait Time',  data:avgWait,    backgroundColor:'rgba(91,108,249,0.55)', borderColor:'#5b6cf9', borderWidth:1.5, borderRadius:6 },
              { label:'Dr. Time',   data:avgDrTime,  backgroundColor:'rgba(56,201,160,0.55)', borderColor:'#38c9a0', borderWidth:1.5, borderRadius:6 },
              { label:'Cleanliness',data:avgClean,   backgroundColor:'rgba(45,207,200,0.55)', borderColor:'#2dcfc8', borderWidth:1.5, borderRadius:6 },
            ]
          },
          options: {
            responsive:true,
            scales: {
              x:{ grid:{display:false}, ticks:{color:'#5a6585',font:{size:12}} },
              y:{ min:0, max:5, grid:{color:'rgba(160,180,220,0.15)'}, ticks:{color:'#5a6585',font:{size:11}, stepSize:1} }
            },
            plugins:{ legend:{ labels:{ color:'#1a2340', font:{size:12}, usePointStyle:true } } }
          }
        });
      } else if (c5) {
        c5.parentElement.innerHTML = '<div class="empty-state"><div>⭐</div><p>No feedback yet</p></div>';
      }

      /* ── Satisfaction donut ── */
      const totalReviews = summary.reduce((s,d) => s + (d.total_reviews||0), 0);
      const positive     = summary.reduce((s,d) => s + (d.positive||0), 0);
      const negative     = summary.reduce((s,d) => s + (d.negative||0), 0);
      const neutral      = totalReviews - positive - negative;

      if (_anSatChart) { _anSatChart.destroy(); _anSatChart = null; }
      const c6 = document.getElementById('anSatisfactionChart');
      if (c6) {
        _anSatChart = new Chart(c6, {
          type: 'doughnut',
          data: {
            labels: ['Positive (4-5★)', 'Neutral (3★)', 'Negative (1-2★)'],
            datasets:[{
              data: [positive||0, neutral||0, negative||0],
              backgroundColor: ['rgba(56,201,160,0.75)','rgba(245,200,66,0.70)','rgba(240,92,110,0.70)'],
              borderColor: ['#38c9a0','#f5c842','#f05c6e'],
              borderWidth: 2, hoverOffset: 8
            }]
          },
          options: {
            responsive:true, cutout:'60%',
            plugins:{ legend:{ position:'bottom', labels:{ color:'#1a2340', font:{size:12}, usePointStyle:true } } }
          }
        });
      }

      /* ── Radar chart: category averages ── */
      if (_anRadarChart) { _anRadarChart.destroy(); _anRadarChart = null; }
      const c7 = document.getElementById('anRadarChart');
      if (c7 && overall.total > 0) {
        _anRadarChart = new Chart(c7, {
          type: 'radar',
          data: {
            labels: ['Overall', 'Wait Time', "Doctor's Time", 'Cleanliness'],
            datasets:[{
              label: 'Clinic Average',
              data: [
                overall.avg_overall    || 0,
                overall.avg_wait       || 0,
                overall.avg_doctor_time|| 0,
                overall.avg_clean      || 0
              ],
              backgroundColor: 'rgba(91,108,249,0.18)',
              borderColor: '#5b6cf9',
              borderWidth: 2,
              pointBackgroundColor: '#5b6cf9',
              pointRadius: 4
            }]
          },
          options: {
            responsive:true,
            scales:{
              r:{
                min:0, max:5, ticks:{ stepSize:1, color:'#5a6585', font:{size:10}, backdropColor:'transparent' },
                grid:{ color:'rgba(160,180,220,0.25)' },
                angleLines:{ color:'rgba(160,180,220,0.25)' },
                pointLabels:{ color:'#1a2340', font:{size:12} }
              }
            },
            plugins:{ legend:{ labels:{ color:'#1a2340', font:{size:12} } } }
          }
        });
      } else if (c7) {
        c7.parentElement.innerHTML = '<div class="empty-state" style="padding:2rem"><div>⭐</div><p>Add feedback to see radar chart</p></div>';
      }

    } catch(e) {
      console.warn('Feedback analytics error:', e);
    }
  }
};

/* Patch AnalyticsPage.render to also call AnalyticsFeedback */
const _origAnRender = AnalyticsPage.render.bind(AnalyticsPage);
AnalyticsPage.render = async function() {
  await _origAnRender();
  await AnalyticsFeedback.render();
};
