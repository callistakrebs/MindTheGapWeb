// Render bars as divs
const viz = document.getElementById('viz');
const bins = [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6, 6.5, 7]; // Preset bin edges

fetch('data/existing-work.csv')
    .then(response => response.text())
    .then(csvText => {
        const result = Papa.parse(csvText, { header: true });
        console.log('Parsed CSV:', result.data);
        const data = result.data; // Assuming 'value' is the key in your CSV
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
        const uniqueModels = [...new Set(data.map(row => row['model'] || 'Unknown'))];
        const uniqueBenchmark = [...new Set(data.map(row => row['benchmark'] || 'Unknown'))];

        const filterModelSelect = document.getElementById('filter-model-select');
        uniqueModels.forEach(model => {
            const option = document.createElement('option');
            option.value = model;
            option.textContent = model;
            filterModelSelect.appendChild(option);
        });

        const filterBenchmarkSelect = document.getElementById('filter-benchmark-select');
        uniqueBenchmark.forEach(benchmark => {
            const option = document.createElement('option');
            option.value = benchmark;
            option.textContent = benchmark;
            filterBenchmarkSelect.appendChild(option);
        });

        // Function to filter data and update the histogram
        const updateHistogram = (selectedModel, selectedBenchmark) => {
            const filteredData = data.filter(row => {
                const modelMatch = selectedModel === 'all' || row['model'] === selectedModel;
                const benchmarkMatch = selectedBenchmark === 'all' || row['benchmark'] === selectedBenchmark;
                return modelMatch && benchmarkMatch;
            });

            // Recalculate bin counts
            const binCounts = {0:0, 0.5:0, 1:0, 1.5:0, 2:0, 2.5:0, 3:0, 3.5:0, 4:0, 4.5:0, 5:0, 5.5:0, 6:0, 6.5:0, 7:0};
            filteredData.forEach(row => {
                const binValue = row['bin'];
                if (binValue !== undefined) {
                    binCounts[binValue] = (binCounts[binValue] || 0) + 1;
                }
            });

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

        // Count the number of rows in each bin
        const binCounts = {0:0, 0.5:0, 1:0, 1.5:0, 2:0, 2.5:0, 3:0, 3.5:0, 4:0, 4.5:0, 5:0, 5.5:0, 6:0, 6.5:0, 7:0};
        data.forEach(row => {
            const binValue = row['bin'];
            if (binValue !== undefined) {
                binCounts[binValue] = (binCounts[binValue] || 0) + 1;
            }
        });

        // Log the bin counts for debugging
        console.log('Bin Counts:', binCounts);

        // Plot the total number of rows for each bin using D3
        const binViz = document.getElementById('bin-viz') || document.createElement('div');
        binViz.id = 'bin-viz';
        binViz.style.marginTop = '20px';
        binViz.innerHTML = ''; // Clear previous content
        // viz.appendChild(binViz);

        // Set up D3 dimensions and scales
        const width = 700;
        const height = 350;
        const margin = { top: 20, right: 20, bottom: 40, left: 40 };

        const svg = d3.select(binViz)
            .append('svg')
            .attr('width', width + margin.left + margin.right)
            .attr('height', height + margin.top + margin.bottom)
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

        // Add bars
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
                // Animate the bar
                d3.select(this)
                    .transition()
                    .duration(300)
                    .attr('fill', '#1976d2')
                    .attr('height', height - yScale(d[1]) + 10)
                    .attr('y', yScale(d[1]) - 10);

                // Animate the label
                svg.select(`.label[data-bin="${d[0]}"]`)
                    .transition()
                    .duration(300)
                    .attr('y', yScale(d[1]) - 15); // Move the label up with the bar
            })
            .on('mouseleave', function (event, d) {
                // Reset the bar
                d3.select(this)
                    .transition()
                    .duration(300)
                    .attr('fill', '#2196f3')
                    .attr('height', height - yScale(d[1]))
                    .attr('y', yScale(d[1]));

                // Reset the label
                svg.select(`.label[data-bin="${d[0]}"]`)
                    .transition()
                    .duration(300)
                    .attr('y', yScale(d[1]) - 5); // Reset the label position
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
        updateHistogram('all', 'all'); // Pass 'all' for both model and benchmark to include all data

        // Add event listeners to both dropdowns
        filterModelSelect.addEventListener('change', () => {
            const selectedModel = filterModelSelect.value;
            const selectedBenchmark = filterBenchmarkSelect.value;
            updateHistogram(selectedModel, selectedBenchmark);
        });

        filterBenchmarkSelect.addEventListener('change', () => {
            const selectedModel = filterModelSelect.value;
            const selectedBenchmark = filterBenchmarkSelect.value;
            updateHistogram(selectedModel, selectedBenchmark);
        });
    })
    .catch(error => console.error('Error fetching or parsing CSV:', error));
