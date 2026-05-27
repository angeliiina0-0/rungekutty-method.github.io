function convertToJS(expr) {
    let e = expr.trim();
    if (!e) return e;
    
    e = e.replace(/([a-zA-Z0-9\(\)]+)\s*\^\s*(\d+)/g, 'Math.pow($1,$2)');
    e = e.replace(/e\s*\^\s*\(?([^\)]+)\)?/g, 'Math.exp($1)');
    e = e.replace(/sin\(/g, 'Math.sin(');
    e = e.replace(/cos\(/g, 'Math.cos(');
    e = e.replace(/tan\(/g, 'Math.tan(');
    e = e.replace(/ln\(/g, 'Math.log(');
    
    return e;
}

function makeFunction(str, isExact = false) {
    let expr = convertToJS(str);
    if (!isExact) {
        return function(x, y) {
            try {
                const fn = new Function('x', 'y', 'return (' + expr + ')');
                return fn(x, y);
            } catch(e) {
                return NaN;
            }
        };
    } else {
        return function(x) {
            try {
                const fn = new Function('x', 'return (' + expr + ')');
                return fn(x);
            } catch(e) {
                return NaN;
            }
        };
    }
}

function rungeKutta4(f, x0, y0, xMax, h) {
    let points = [{ x: x0, y: y0 }];
    let x = x0;
    let y = y0;
    let maxSteps = 10000;
    let steps = 0;
    
    while (x < xMax - 0.0000001 && steps < maxSteps) {
        let currentH = Math.min(h, xMax - x);
        if (currentH <= 0) break;
        
        let k1 = f(x, y);
        let k2 = f(x + currentH / 2, y + (currentH / 2) * k1);
        let k3 = f(x + currentH / 2, y + (currentH / 2) * k2);
        let k4 = f(x + currentH, y + currentH * k3);
        
        let newY = y + (currentH / 6) * (k1 + 2 * k2 + 2 * k3 + k4);
        let newX = x + currentH;
        
        points.push({ x: newX, y: newY });
        x = newX;
        y = newY;
        steps++;
    }
    
    return points;
}

let lastPoints = null;
let lastHasExact = false;
let lastExactVals = null;

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
    
    let tbody = document.getElementById('resultTable').querySelector('tbody');
    tbody.innerHTML = '';
    Plotly.newPlot('graph', [], {}, {});
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
        showError('Ошибка в уравнении. Примеры: x + y, sin(x) - y, 2*x*y, -2*y');
        return;
    }
    
    let points = rungeKutta4(f, x0, y0, xMax, h);
    let xVals = points.map(p => p.x);
    let yVals = points.map(p => p.y);
    
    let exactFn = null;
    let exactVals = null;
    let hasExact = false;
    
    if (exactStr !== "") {
        try {
            exactFn = makeFunction(exactStr, true);
            let testExact = exactFn(x0);
            if (!isNaN(testExact) && isFinite(testExact)) {
                hasExact = true;
                exactVals = xVals.map(x => exactFn(x));
            }
        } catch(e) {
            console.warn('Точное решение не распознано');
        }
    }

    document.getElementById('exactHeader').style.display = hasExact ? 'table-cell' : 'none';
    document.getElementById('errorHeader').style.display = hasExact ? 'table-cell' : 'none';
    
    let tbody = document.getElementById('resultTable').querySelector('tbody');
    tbody.innerHTML = '';
    
    let totalPoints = points.length;
    let stepSize = Math.max(1, Math.floor(totalPoints / 20));
    
    for (let i = 0; i < totalPoints; i += stepSize) {
        let row = tbody.insertRow();
        let xVal = points[i].x;
        let yVal = points[i].y;
        row.insertCell(0).innerText = xVal.toFixed(5);
        row.insertCell(1).innerText = yVal.toFixed(6);
        
        if (hasExact && exactVals && i < exactVals.length) {
            let yExact = exactVals[i];
            let error = Math.abs(yVal - yExact);
            row.insertCell(2).innerText = yExact.toFixed(6);
            row.insertCell(3).innerText = error.toExponential(4);
        }
    }
    
    if (totalPoints > 0 && (totalPoints - 1) % stepSize !== 0) {
        let row = tbody.insertRow();
        let xVal = points[totalPoints - 1].x;
        let yVal = points[totalPoints - 1].y;
        row.insertCell(0).innerText = xVal.toFixed(5);
        row.insertCell(1).innerText = yVal.toFixed(6);
        
        if (hasExact && exactVals && totalPoints - 1 < exactVals.length) {
            let yExact = exactVals[totalPoints - 1];
            let error = Math.abs(yVal - yExact);
            row.insertCell(2).innerText = yExact.toFixed(6);
            row.insertCell(3).innerText = error.toExponential(4);
        }
    }
    
    let traces = [{
        x: xVals,
        y: yVals,
        mode: 'lines',
        name: 'RK4 (численное решение)',
        line: { color: '#2a5298', width: 2.5 }
    }];
    
    if (hasExact && exactVals) {
        traces.push({
            x: xVals,
            y: exactVals,
            mode: 'lines',
            name: 'Точное решение',
            line: { color: '#e67e22', width: 2, dash: 'dash' }
        });
    }
    
    let layout = {
        title: 'График решения дифференциального уравнения',
        xaxis: { title: 'x' },
        yaxis: { title: 'y' },
        plot_bgcolor: '#fafafa',
        paper_bgcolor: '#fafafa',
        height: 360,
        margin: { l: 50, r: 30, t: 50, b: 50 }
    };
    
    Plotly.newPlot('graph', traces, layout, { responsive: true });
    
    document.getElementById('results').style.display = 'block';
    
    lastPoints = points;
    lastHasExact = hasExact;
    lastExactVals = exactVals;
}

document.getElementById('calcBtn').addEventListener('click', solve);
document.getElementById('resetBtn').addEventListener('click', resetForm);

document.querySelectorAll('.ex').forEach(btn => {
    btn.addEventListener('click', () => {
        document.getElementById('funcInput').value = btn.getAttribute('data-val');
    });
});

window.addEventListener('load', () => {
    solve();
});