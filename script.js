// Render bars as divs
const viz = document.getElementById('viz');
const bins = [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6, 6.5, 7]; // Preset bin edges

fetch('data/existing-work.csv')
    .then(response => response.text())
    .then(csvText => {
        const result = Papa.parse(csvText, { header: true });
        console.log('Parsed CSV:', result.data);
        const data = result.data; // Assuming 'value' is the key in your CSV

        // Parse Data object to extract size, logsize, and histogram
        data.forEach((value, index) => {
            if (!data[index]['size']) {
                console.warn(`Skipping row ${index} due to missing 'size' value.`);
                return;
            }
            const size = parseInt(data[index]['size'].replace(/_/g, ''), 10);
            data[index]['adjustedSize'] = size; // Adding a new column 'adjustedSize'
            data[index]['logsize'] = Math.log10(size); // Adding a new column 'logsize'
            if (data[index]['logsize'] === -Infinity) {
                data[index]['logsize'] = 0; // Default to 0 if logsize is infinite
            }
            // Determine the bin for the current size using preset bins
            let bin = undefined; // Default to no bin
            for (let i = 0; i < bins.length - 1; i++) {
                if (data[index]['logsize'] >= bins[i] && data[index]['logsize'] < bins[i + 1]) {
                    bin = bins[i]; // Assign the bin based on the range
                    break;
                }
            }
            data[index]['bin'] = bin; // Adding a new column 'bin'
            if (data[index]['bin'] === 7) {
                console.log(data[index])
            }
        });

        // Extract unique models/benchmarks for the dropdown
        const uniqueModels = [...new Set(data.map(row => row['model']))];
        const uniqueBenchmark = [...new Set(data.map(row => row['benchmark']))];
        const uniqueModality = [...new Set(data.map(row => row['modality']))];
        const uniqueDomain = [...new Set(data.map(row => row['domain']))];
        const uniqueTask = [...new Set(data.map(row => row['task']))];

        // Create dropdowns for filtering Model
        const filterModelSelect = document.getElementById('filter-model-select');
        uniqueModels.sort().forEach(model => {
            const option = document.createElement('option');
            option.value = model;
            option.textContent = model;
            filterModelSelect.appendChild(option);
        });

        // Create dropdowns for filtering Benchmark
        // TODO: add a search functionality to the benchmark dropdown
        const filterBenchmarkSelect = document.getElementById('filter-benchmark-select');
        uniqueBenchmark.sort().forEach(benchmark => {
            const option = document.createElement('option');
            option.value = benchmark;
            option.textContent = benchmark;
            filterBenchmarkSelect.appendChild(option);
        });

        // Create dropdowns for filtering Modality
        // TODO: add a search functionality to the dropdown
        const filterModalitySelect = document.getElementById('filter-modality-select');
        uniqueModality.sort().forEach(modality => {
            const option = document.createElement('option');
            option.value = modality;
            option.textContent = modality;
            filterModalitySelect.appendChild(option);
        });

        const filterDomainSelect = document.getElementById('filter-domain-select');
        uniqueDomain.sort().forEach(domain => {
            const option = document.createElement('option');
            option.value = domain;
            option.textContent = domain;
            filterDomainSelect.appendChild(option);
        });

        const filterTaskSelect = document.getElementById('filter-task-select');
        uniqueTask.sort().forEach(task => {
            const option = document.createElement('option');
            option.value = task;
            option.textContent = task;
            filterTaskSelect.appendChild(option);
        });

        /**
         * Calculates the count of unique benchmarks for each bin from the provided data.
         *
         * @param {Array<Object>} data - An array of objects where each object represents a row of data.
         *                                Each row should have a `bin` property (numeric or string) and a `benchmark` property (string).
         * @returns {Object} An object where the keys are bin values and the values are the counts of unique benchmarks in each bin.
         *
         * @example
         * const data = [
         *   { bin: 1, benchmark: 'A' },
         *   { bin: 1, benchmark: 'B' },
         *   { bin: 1, benchmark: 'A' },
         *   { bin: 2, benchmark: 'C' }
         * ];
         * const result = getUniqueBenchmarksBinCounts(data);
         * console.log(result); // { '0': 0, '0.5': 0, ..., '1': 2, '2': 1, ... }
         */
        const getUniqueBenchmarksBinCounts = (data) => {
            // Recalculate bin counts to count unique benchmarks
            const binCounts = {0:0, 0.5:0, 1:0, 1.5:0, 2:0, 2.5:0, 3:0, 3.5:0, 4:0, 4.5:0, 5:0, 5.5:0, 6:0, 6.5:0, 7:0};
            const uniqueBenchmarksPerBin = {}; // Track unique benchmark,size pairs for each bin

            data.forEach(row => {
                const binValue = row['bin'];
                const benchmark = row['benchmark'];
                const size = row['size'];

                if (binValue !== undefined && benchmark && size) {
                    if (!uniqueBenchmarksPerBin[binValue]) {
                        uniqueBenchmarksPerBin[binValue] = new Set();
                    }
                    uniqueBenchmarksPerBin[binValue].add(`${benchmark}__${size}`); // Add unique benchmark-size pair to the set
                }
            });

            // Convert the sets into counts
            Object.keys(uniqueBenchmarksPerBin).forEach(bin => {
                binCounts[bin] = uniqueBenchmarksPerBin[bin].size;
            });

            // Debugging: Log the unique benchmarks per bin and the final bin counts
            console.log('Unique Benchmarks Per Bin:', uniqueBenchmarksPerBin);
            console.log('Bin Counts:', binCounts);
            return binCounts;
        }

        /**
         * Updates the histogram visualization based on the selected model and benchmark.
         * Filters the data, calculates bin counts, and updates the bars, labels, and tooltips
         * in the histogram accordingly.
         *
         * @param {string} selectedModel - The selected model to filter the data. Use 'all' to include all models.
         * @param {string} selectedBenchmark - The selected benchmark to filter the data. Use 'all' to include all benchmarks.
         */
        const updateHistogram = (selectedModel, selectedBenchmark, selectedModality, selectedDomain, selectedTask) => {
            const filteredData = data.filter(row => {
                const modelMatch = selectedModel === 'all' || row['model'] === selectedModel;
                const benchmarkMatch = selectedBenchmark === 'all' || row['benchmark'] === selectedBenchmark;
                const modalityMatch = selectedModality === 'all' || row['modality'] === selectedModality;
                const domainMatch = selectedDomain === 'all' || row['benchmark'] === selectedDomain;
                const taskMatch = selectedTask === 'all' || row['task'] === selectedTask;
                return modelMatch && benchmarkMatch && modalityMatch && domainMatch && taskMatch;
            });

            const binCounts = getUniqueBenchmarksBinCounts(filteredData);

            // Update the histogram
            const bars = svg.selectAll('.bar')
                .data(Object.entries(binCounts));

            bars.enter()
                .append('rect')
                .attr('class', 'bar')
                .merge(bars)
                .transition()
                .duration(300)
                .attr('x', d => xScale(parseFloat(d[0])))
                .attr('y', d => yScale(d[1]))
                .attr('width', xScale(bins[1]) - xScale(bins[0]))
                .attr('height', d => height - yScale(d[1]))
                .attr('fill', '#2196f3');

            bars.exit().remove();

            // Rebind hover events for the tooltip
            bars.on('mouseenter', function (event, d) {
                const binValue = parseFloat(d[0]);
                const filteredBinData = filteredData.filter(row => row['bin'] === binValue);

                // Extract models and benchmarks
                const models = [...new Set(filteredBinData.map(row => row['model'] || 'Unknown'))];
                const benchmarks = [...new Set(filteredBinData.map(row => row['benchmark'] || 'Unknown'))];

                // Update tooltip content
                tooltip.innerHTML = `
                    <strong>Models:</strong> ${models.join(', ')}<br>
                    <strong>Benchmarks:</strong> ${benchmarks.join(', ')}
                `;
                tooltip.style.display = 'block';

                // Highlight the bar and extend it
                d3.select(this)
                    .transition()
                    .duration(300)
                    .attr('fill', '#1976d2')
                    .attr('y', yScale(d[1]) - 5) // Move the bar slightly upward
                    .attr('height', height - yScale(d[1]) + 5); // Extend the height

                // Move the corresponding label upward
                svg.select(`.label[data-bin="${binValue}"]`)
                    .transition()
                    .duration(300)
                    .attr('y', yScale(d[1]) - 10); // Adjust label position
            })
            .on('mousemove', function (event) {
                // Position the tooltip near the mouse cursor
                tooltip.style.left = `${event.pageX + 10}px`;
                tooltip.style.top = `${event.pageY + 10}px`;
            })
            .on('mouseleave', function (event, d) {
                // Hide the tooltip
                tooltip.style.display = 'none';

                // Reset the bar color, position, and size
                d3.select(this)
                    .transition()
                    .duration(300)
                    .attr('fill', '#2196f3')
                    .attr('y', yScale(d[1])) // Reset the bar's original position
                    .attr('height', height - yScale(d[1])); // Reset the bar's original height

                // Reset the corresponding label position
                const binValue = parseFloat(d[0]);
                svg.select(`.label[data-bin="${binValue}"]`)
                    .transition()
                    .duration(300)
                    .attr('y', yScale(d[1]) - 5); // Reset label position
            });

            // Update labels
            const labels = svg.selectAll('.label')
                .data(Object.entries(binCounts));

            labels.enter()
                .append('text')
                .attr('class', 'label')
                .merge(labels)
                .transition()
                .duration(300)
                .attr('x', d => xScale(parseFloat(d[0])) + (xScale(bins[1]) - xScale(bins[0])) / 2)
                .attr('y', d => yScale(d[1]) - 5)
                .attr('text-anchor', 'middle')
                .text(d => d[1]);

            labels.exit().remove();
        };

        const binCounts = getUniqueBenchmarksBinCounts(data);

        // Plot the total number of rows for each bin using D3
        const binViz = document.getElementById('bin-viz') || document.createElement('div');
        binViz.id = 'bin-viz';
        binViz.style.marginTop = '20px';
        binViz.innerHTML = ''; // Clear previous content
        // viz.appendChild(binViz);

        // Set up D3 dimensions and scales
        const width = 800; // Increase the width
        const height = 500; // Increase the height
        const margin = { top: 50, right: 50, bottom: 70, left: 70 }; // Adjust margins for more space

        // Add a class to the SVG container
        const svg = d3.select('#bin-viz')
            .append('svg')
            .attr('class', 'histogram')
            .attr('width', width + margin.left + margin.right) // Adjust for new width
            .attr('height', height + margin.top + margin.bottom) // Adjust for new height
            .append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);

        const xScale = d3.scaleLinear()
            .domain([bins[0], bins[bins.length - 1] + (bins[1] - bins[0])]) // Start from the first bin (0)
            .range([0, width]);

        const yScale = d3.scaleLinear()
            .domain([0, d3.max(Object.values(binCounts))])
            .nice()
            .range([height, 0]);

        // Add axes
        svg.append('g')
            .attr('transform', `translate(0,${height})`)
            .call(
                d3.axisBottom(xScale)
                    .tickValues(bins) // Use bins as tick values
                    .tickFormat(d => {
                        if (d === 0) return '0'; // Special case for 0
                        const value = Math.pow(10, d); // Calculate 10^x
                        if (value >= 1e6) return `${(value / 1e6).toFixed(0)}M`; // Format as "1M", "10M", etc.
                        if (value >= 1e3) return `${(value / 1e3).toFixed(0)}K`; // Format as "1K", "10K", etc.
                        return value.toFixed(0); // Format smaller values as integers
                    })
            )
            .selectAll('text')
            .style('text-anchor', 'center')
            .style('font-size', '14px') // Increase font size for x-axis labels
            .style('display', (_, i) => i % 2 === 0 ? 'block' : 'none'); // Hide every other label

        svg.append('g')
            .call(d3.axisLeft(yScale))
            .selectAll('text')
            .style('font-size', '14px'); // Increase font size for y-axis labels

        // Add x-axis label
        svg.append('text')
            .attr('class', 'x-axis-label')
            .attr('x', width / 2) // Center the label horizontally
            .attr('y', height + margin.bottom - 20) // Position below the x-axis
            .attr('text-anchor', 'middle') // Center the text
            .style('font-size', '20px') // Optional: Set font size
            .text('Number of Training Examples');

        // Add y-axis label
        svg.append('text')
            .attr('class', 'y-axis-label')
            .attr('x', -height / 2)
            .attr('y', -margin.left + 30)
            .attr('text-anchor', 'middle')
            .attr('transform', 'rotate(-90)')
            .text('Number of Benchmarks');

        // Create a tooltip element
        const tooltip = document.createElement('div');
        tooltip.id = 'tooltip';
        tooltip.style.position = 'absolute';
        tooltip.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        tooltip.style.color = 'white';
        tooltip.style.padding = '8px';
        tooltip.style.borderRadius = '4px';
        tooltip.style.pointerEvents = 'none';
        tooltip.style.display = 'none';
        document.body.appendChild(tooltip);

        // Add bars with hover functionality
        svg.selectAll('.bar')
            .data(Object.entries(binCounts))
            .enter()
            .append('rect')
            .attr('class', 'bar')
            .attr('x', d => xScale(parseFloat(d[0]))) // Position the bar at the start of the bin
            .attr('y', d => yScale(d[1]))
            .attr('width', d => xScale(bins[1]) - xScale(bins[0])) // Width spans the bin range
            .attr('height', d => height - yScale(d[1]))
            .attr('fill', '#2196f3')
            .on('mouseenter', function (event, d) {
                // Filter data for the current bin
                const binValue = parseFloat(d[0]);
                const filteredData = data.filter(row => row['bin'] === binValue);

                // Extract models and benchmarks
                const models = [...new Set(filteredData.map(row => row['model'] || 'Unknown'))];
                const benchmarks = [...new Set(filteredData.map(row => row['benchmark'] || 'Unknown'))];

                // Update tooltip content
                tooltip.innerHTML = `
                    <strong>Models:</strong> ${models.join(', ')}<br>
                    <strong>Benchmarks:</strong> ${benchmarks.join(', ')}
                `;
                tooltip.style.display = 'block';

                // Highlight the bar
                d3.select(this)
                    .transition()
                    .duration(300)
                    .attr('fill', '#1976d2');
            })
            .on('mousemove', function (event) {
                // Position the tooltip near the mouse cursor
                tooltip.style.left = `${event.pageX + 10}px`;
                tooltip.style.top = `${event.pageY + 10}px`;
            })
            .on('mouseleave', function () {
                // Hide the tooltip
                tooltip.style.display = 'none';

                // Reset the bar color
                d3.select(this)
                    .transition()
                    .duration(300)
                    .attr('fill', '#2196f3');
            });

        // Add labels
        svg.selectAll('.label')
            .data(Object.entries(binCounts))
            .enter()
            .append('text')
            .attr('class', 'label')
            .attr('data-bin', d => d[0]) // Add a custom attribute to identify the label
            .attr('x', d => xScale(parseFloat(d[0])) + (xScale(bins[1]) - xScale(bins[0])) / 2)
            .attr('y', d => yScale(d[1]) - 5)
            .attr('text-anchor', 'middle')
            .text(d => d[1]);

        // Initial rendering of the histogram
        updateHistogram('all', 'all','all','all','all'); // Pass 'all' for both model and benchmark to include all data

        // Add event listeners to both dropdowns
        filterModelSelect.addEventListener('change', () => {
            const selectedModel = filterModelSelect.value;
            const selectedBenchmark = filterBenchmarkSelect.value;
            const selectedModality = filterModalitySelect.value;
            const selectedDomain = filterDomainSelect.value;
            const selectedTask = filterTaskSelect.value;
            updateHistogram(selectedModel, selectedBenchmark, selectedModality, selectedDomain, selectedTask);
        });

        filterBenchmarkSelect.addEventListener('change', () => {
            const selectedModel = filterModelSelect.value;
            const selectedBenchmark = filterBenchmarkSelect.value;
            const selectedModality = filterModalitySelect.value;
            const selectedDomain = filterDomainSelect.value;
            const selectedTask = filterTaskSelect.value;
            updateHistogram(selectedModel, selectedBenchmark, selectedModality, selectedDomain, selectedTask);
        });

        filterModalitySelect.addEventListener('change', () => {
            const selectedModel = filterModelSelect.value;
            const selectedBenchmark = filterBenchmarkSelect.value;
            const selectedModality = filterModalitySelect.value;
            const selectedDomain = filterDomainSelect.value;
            const selectedTask = filterTaskSelect.value;
            updateHistogram(selectedModel, selectedBenchmark, selectedModality, selectedDomain, selectedTask);
        });
        filterDomainSelect.addEventListener('change', () => {
            const selectedModel = filterModelSelect.value;
            const selectedBenchmark = filterBenchmarkSelect.value;
            const selectedModality = filterModalitySelect.value;
            const selectedDomain = filterDomainSelect.value;
            const selectedTask = filterTaskSelect.value;
            updateHistogram(selectedModel, selectedBenchmark, selectedModality, selectedDomain, selectedTask);
        });
        filterTaskSelect.addEventListener('change', () => {
            const selectedModel = filterModelSelect.value;
            const selectedBenchmark = filterBenchmarkSelect.value;
            const selectedModality = filterModalitySelect.value;
            const selectedDomain = filterDomainSelect.value;
            const selectedTask = filterTaskSelect.value;
            updateHistogram(selectedModel, selectedBenchmark, selectedModality, selectedDomain, selectedTask);
        });
    })
    .catch(error => console.error('Error fetching or parsing CSV:', error));
