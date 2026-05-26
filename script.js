function convertToJS(expr) {
    let e = expr.trim();
    if (!e) return e;
    e = e.replace(/([a-z0-9\(\)]+)\^(\d+)/gi, 'Math.pow($1,$2)');
    e = e.replace(/e\^\(?([^\)]+)\)?/g, 'Math.exp($1)');
    e = e.replace(/sin\(/g, 'Math.sin(');
    e = e.replace(/cos\(/g, 'Math.cos(');
    e = e.replace(/tan\(/g, 'Math.tan(');
    e = e.replace(/ln\(/g, 'Math.log(');
    return e;
}

function makeFunction(str, exact = false) {
    let expr = convertToJS(str);
    if (!exact) {
        return (x, y) => {
            try {
                let fn = new Function('x', 'y', 'return (' + expr + ')');
                return fn(x, y);
            } catch(e) { return NaN; }
        };
    } else {
        return (x) => {
            try {
                let fn = new Function('x', 'return (' + expr + ')');
                return fn(x);
            } catch(e) { return NaN; }
        };
    }
}

function rungeKutta4(f, x0, y0, xMax, h) {
    let points = [{ x: x0, y: y0 }];
    let x = x0, y = y0;
    let steps = 0;
    while (x < xMax && steps < 50000) {
        let hh = Math.min(h, xMax - x);
        let k1 = f(x, y);
        let k2 = f(x + hh/2, y + hh/2 * k1);
        let k3 = f(x + hh/2, y + hh/2 * k2);
        let k4 = f(x + hh, y + hh * k3);
        y = y + hh/6 * (k1 + 2*k2 + 2*k3 + k4);
        x = x + hh;
        points.push({ x, y });
        steps++;
    }
    return points;
}

let lastPoints = null, lastExact = null, lastExactVals = null;

function showError(msg) {
    let div = document.getElementById('errorMsg');
    div.innerText = msg;
    div.style.display = 'block';
    document.getElementById('results').style.display = 'none';
}

function hideError() {
    document.getElementById('errorMsg').style.display = 'none';
}

function resetForm() {
    document.getElementById('funcInput').value = 'x + y';
    document.getElementById('x0').value = '0';
    document.getElementById('y0').value = '1';
    document.getElementById('xMax').value = '2';
    document.getElementById('step').value = '0.1';
    document.getElementById('exactFunc').value = '';
    document.getElementById('results').style.display = 'none';
    hideError();
}

function solve() {
    hideError();
    let funcStr = document.getElementById('funcInput').value.trim();
    let x0 = parseFloat(document.getElementById('x0').value);
    let y0 = parseFloat(document.getElementById('y0').value);
    let xMax = parseFloat(document.getElementById('xMax').value);
    let h = parseFloat(document.getElementById('step').value);
    let exactStr = document.getElementById('exactFunc').value.trim();

    if (isNaN(x0) || isNaN(y0) || isNaN(xMax) || isNaN(h) || h <= 0 || xMax <= x0) {
        showError('Проверьте числовые поля: x₀, y₀, x_max > x₀, шаг > 0');
        return;
    }
    if (!funcStr) {
        showError('Введите уравнение');
        return;
    }

    let f;
    try {
        f = makeFunction(funcStr, false);
        let test = f(x0, y0);
        if (isNaN(test) || !isFinite(test)) throw new Error();
    } catch(e) {
        showError('Ошибка в уравнении. Примеры: x + y, sin(x) - y, 2*x*y');
        return;
    }

    let points = rungeKutta4(f, x0, y0, xMax, h);
    let xVals = points.map(p => p.x);
    let yVals = points.map(p => p.y);

    let exactFn = null, exactVals = null, hasExact = false;
    if (exactStr) {
        try {
            exactFn = makeFunction(exactStr, true);
            let test = exactFn(x0);
            if (!isNaN(test) && isFinite(test)) {
                hasExact = true;
                exactVals = xVals.map(x => exactFn(x));
            }
        } catch(e) {}
    }

    let tbody = document.getElementById('resultTable').querySelector('tbody');
    tbody.innerHTML = '';
    let total = points.length;
    let stepSize = Math.max(1, Math.floor(total / 20));
    for (let i = 0; i < total; i += stepSize) {
        let row = tbody.insertRow();
        let xv = points[i].x;
        let yv = points[i].y;
        row.insertCell(0).innerText = xv.toFixed(4);
        row.insertCell(1).innerText = yv.toFixed(5);
        if (hasExact && exactVals && i < exactVals.length) {
            let ye = exactVals[i];
            let err = Math.abs(yv - ye);
            row.insertCell(2).innerText = ye.toFixed(5);
            row.insertCell(3).innerText = err.toFixed(7);
        } else {
            row.insertCell(2).innerText = '—';
            row.insertCell(3).innerText = '—';
        }
    }
    if (total > 0 && (total-1) % stepSize !== 0) {
        let row = tbody.insertRow();
        let xv = points[total-1].x;
        let yv = points[total-1].y;
        row.insertCell(0).innerText = xv.toFixed(4);
        row.insertCell(1).innerText = yv.toFixed(5);
        if (hasExact && exactVals && total-1 < exactVals.length) {
            let ye = exactVals[total-1];
            let err = Math.abs(yv - ye);
            row.insertCell(2).innerText = ye.toFixed(5);
            row.insertCell(3).innerText = err.toFixed(7);
        } else {
            row.insertCell(2).innerText = '—';
            row.insertCell(3).innerText = '—';
        }
    }

    let traces = [{ x: xVals, y: yVals, mode: 'lines', name: 'RK4', line: { color: '#2a5298', width: 2.5 } }];
    if (hasExact && exactVals) {
        traces.push({ x: xVals, y: exactVals, mode: 'lines', name: 'Точное', line: { color: '#e67e22', width: 2, dash: 'dash' } });
    }
    Plotly.newPlot('graph', traces, {
        height: 350,
        margin: { l: 45, r: 20, t: 35, b: 40 },
        plot_bgcolor: '#fafafa',
        paper_bgcolor: '#fafafa',
        xaxis: { title: 'x' },
        yaxis: { title: 'y' }
    }, { responsive: true });

    document.getElementById('results').style.display = 'block';
    lastPoints = points;
    lastExact = hasExact;
    lastExactVals = exactVals;
}

document.getElementById('calcBtn').addEventListener('click', solve);
document.getElementById('resetBtn').addEventListener('click', resetForm);
document.querySelectorAll('.ex').forEach(btn => {
    btn.addEventListener('click', () => {
        document.getElementById('funcInput').value = btn.getAttribute('data-val');
    });
});

window.addEventListener('load', () => { solve(); });