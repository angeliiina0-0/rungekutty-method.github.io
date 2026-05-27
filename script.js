// Функция преобразования удобной записи в JavaScript синтаксис
function convertToJS(expr) {
    let e = expr.trim();
    if (!e) return e;
    
    // Замена x^2 на Math.pow(x,2) с учётом пробелов
    e = e.replace(/([a-zA-Z0-9\(\)]+)\s*\^\s*(\d+)/g, 'Math.pow($1,$2)');
    
    // Замена e^x на Math.exp(x)
    e = e.replace(/e\s*\^\s*\(?([^\)]+)\)?/g, 'Math.exp($1)');
    
    // Тригонометрические и логарифмические функции
    e = e.replace(/sin\(/g, 'Math.sin(');
    e = e.replace(/cos\(/g, 'Math.cos(');
    e = e.replace(/tan\(/g, 'Math.tan(');
    e = e.replace(/ln\(/g, 'Math.log(');
    
    return e;
}

// Создание функции из строки
function makeFunction(str) {
    let expr = convertToJS(str);
    // Возвращаем функцию, которая принимает x и y
    return function(x, y) {
        try {
            // Создаём функцию с параметрами x, y
            const fn = new Function('x', 'y', 'return (' + expr + ')');
            return fn(x, y);
        } catch(e) {
            console.error('Ошибка вычисления:', e);
            return NaN;
        }
    };
}

// Алгоритм Рунге-Кутта 4-го порядка
function rungeKutta4(f, x0, y0, xMax, h) {
    let points = [{ x: x0, y: y0 }];
    let x = x0;
    let y = y0;
    
    // Ограничиваем максимальное количество шагов (защита от зависания)
    let maxSteps = 10000;
    let steps = 0;
    
    // Используем небольшое смещение для сравнения чисел с плавающей точкой
    while (x < xMax - 0.0000001 && steps < maxSteps) {
        // Корректируем шаг, чтобы не перескочить через xMax
        let currentH = Math.min(h, xMax - x);
        if (currentH <= 0) break;
        
        // Вычисляем коэффициенты
        let k1 = f(x, y);
        let k2 = f(x + currentH / 2, y + (currentH / 2) * k1);
        let k3 = f(x + currentH / 2, y + (currentH / 2) * k2);
        let k4 = f(x + currentH, y + currentH * k3);
        
        // Вычисляем новое значение
        let newY = y + (currentH / 6) * (k1 + 2 * k2 + 2 * k3 + k4);
        let newX = x + currentH;
        
        points.push({ x: newX, y: newY });
        x = newX;
        y = newY;
        steps++;
    }
    
    return points;
}

// Переменные для хранения последних данных
let lastPoints = null;

// Показать сообщение об ошибке
function showError(msg) {
    let div = document.getElementById('errorMsg');
    div.innerText = msg;
    div.style.display = 'block';
    document.getElementById('results').style.display = 'none';
}

// Скрыть сообщение об ошибке
function hideError() {
    let div = document.getElementById('errorMsg');
    div.style.display = 'none';
}

// Сброс всех полей и скрытие результатов
function resetForm() {
    document.getElementById('funcInput').value = 'x + y';
    document.getElementById('x0').value = '0';
    document.getElementById('y0').value = '1';
    document.getElementById('xMax').value = '2';
    document.getElementById('step').value = '0.1';
    document.getElementById('results').style.display = 'none';
    hideError();
    
    // Очищаем таблицу
    let tbody = document.getElementById('resultTable').querySelector('tbody');
    tbody.innerHTML = '';
    
    // Очищаем график
    Plotly.newPlot('graph', [], {}, {});
}

// Основная функция решения
function solve() {
    hideError();
    
    // Получаем значения из полей ввода
    let funcStr = document.getElementById('funcInput').value.trim();
    let x0 = parseFloat(document.getElementById('x0').value);
    let y0 = parseFloat(document.getElementById('y0').value);
    let xMax = parseFloat(document.getElementById('xMax').value);
    let h = parseFloat(document.getElementById('step').value);
    
    // Проверка корректности ввода
    if (isNaN(x0)) {
        showError('Ошибка: x₀ должно быть числом');
        return;
    }
    if (isNaN(y0)) {
        showError('Ошибка: y₀ должно быть числом');
        return;
    }
    if (isNaN(xMax)) {
        showError('Ошибка: x_max должно быть числом');
        return;
    }
    if (isNaN(h) || h <= 0) {
        showError('Ошибка: шаг h должен быть положительным числом');
        return;
    }
    if (xMax <= x0) {
        showError('Ошибка: x_max должно быть больше x₀');
        return;
    }
    if (!funcStr) {
        showError('Ошибка: введите уравнение');
        return;
    }
    
    // Создаём функцию из введённого уравнения
    let f;
    try {
        f = makeFunction(funcStr);
        // Проверяем работу функции на начальной точке
        let testValue = f(x0, y0);
        if (isNaN(testValue) || !isFinite(testValue)) {
            throw new Error('Функция вернула нечисловое значение');
        }
    } catch(e) {
        showError('Ошибка в уравнении. Используйте: x + y, sin(x) - y, 2*x*y, -2*y');
        return;
    }
    
    // Выполняем расчёт методом Рунге-Кутта
    let points;
    try {
        points = rungeKutta4(f, x0, y0, xMax, h);
        if (!points || points.length === 0) {
            throw new Error('Расчёт не дал результатов');
        }
    } catch(e) {
        showError('Ошибка при расчёте: ' + e.message);
        return;
    }
    
    // Получаем массивы x и y для графика
    let xVals = points.map(p => p.x);
    let yVals = points.map(p => p.y);
    
    // Заполняем таблицу (не более 20 строк для читаемости)
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
    }
    
    // Добавляем последнюю точку, если она не была добавлена
    if (totalPoints > 0 && (totalPoints - 1) % stepSize !== 0) {
        let row = tbody.insertRow();
        let xVal = points[totalPoints - 1].x;
        let yVal = points[totalPoints - 1].y;
        row.insertCell(0).innerText = xVal.toFixed(5);
        row.insertCell(1).innerText = yVal.toFixed(6);
    }
    
    // Строим график
    let trace = {
        x: xVals,
        y: yVals,
        mode: 'lines',
        name: 'Решение RK4',
        line: { color: '#2a5298', width: 2.5 }
    };
    
    let layout = {
        title: 'График решения дифференциального уравнения',
        xaxis: { title: 'x' },
        yaxis: { title: 'y' },
        plot_bgcolor: '#fafafa',
        paper_bgcolor: '#fafafa',
        height: 380,
        margin: { l: 50, r: 30, t: 50, b: 50 }
    };
    
    Plotly.newPlot('graph', [trace], layout, { responsive: true });
    
    // Показываем блок с результатами
    document.getElementById('results').style.display = 'block';
    
    // Сохраняем данные для возможного использования
    lastPoints = points;
}

// Назначение обработчиков событий
document.getElementById('calcBtn').addEventListener('click', solve);
document.getElementById('resetBtn').addEventListener('click', resetForm);

// Кнопки-примеры
document.querySelectorAll('.ex').forEach(btn => {
    btn.addEventListener('click', () => {
        document.getElementById('funcInput').value = btn.getAttribute('data-val');
    });
});

// Автоматический запуск при загрузке страницы
window.addEventListener('load', () => {
    solve();
});