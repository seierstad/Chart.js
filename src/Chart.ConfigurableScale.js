(function () {
    "use strict";

    var root = this,
        Chart = root.Chart,
        helpers = Chart.helpers;

    Chart.ConfigurableScale = Chart.Scale.extend({

        draw: function () {
            var ctx = this.ctx,
                yLabelGap = (this.endPoint - this.startPoint) / this.steps,
                xStart = Math.round(this.xScalePaddingLeft);
            if (this.display) {
                ctx.fillStyle = this.textColor;
                ctx.font = this.font;
                helpers.each(this.yLabels, function (labelString, index) {
                    var yLabelCenter = this.endPoint - (yLabelGap * index),
                        linePositionY = Math.round(yLabelCenter);

                    ctx.textAlign = "right";
                    ctx.textBaseline = "middle";
                    if (this.showLabels) {
                        ctx.fillText(labelString, xStart - 10, yLabelCenter);
                    }
                    ctx.beginPath();
                    if (index > 0) {
                        // This is a grid line in the centre, so drop that
                        ctx.lineWidth = this.gridLineWidth;
                        ctx.strokeStyle = this.gridLineColor;
                    } else {
                        // This is the first line on the scale
                        ctx.lineWidth = this.lineWidth;
                        ctx.strokeStyle = this.lineColor;
                    }

                    linePositionY += helpers.aliasPixel(ctx.lineWidth);

                    ctx.moveTo(xStart, linePositionY);
                    ctx.lineTo(this.width, linePositionY);
                    ctx.stroke();
                    ctx.closePath();

                    ctx.lineWidth = this.lineWidth;
                    ctx.strokeStyle = this.lineColor;
                    ctx.beginPath();
                    ctx.moveTo(xStart - 5, linePositionY);
                    ctx.lineTo(xStart, linePositionY);
                    ctx.stroke();
                    ctx.closePath();

                }, this);

                helpers.each(this.xLabels, function (label, index) {
                    var xPos = this.calculateX(index) + helpers.aliasPixel(this.lineWidth),
                        // Check to see if line/bar here and decide where to place the line
                        linePos = this.calculateX(index - (this.offsetGridLines ? 0.5 : 0)) + helpers.aliasPixel(this.lineWidth),
                        isRotated = (this.xLabelRotation > 0);

                    if (!this.noVerticalGridLines || (this.noVerticalGridLines && index === 0)) {
                        ctx.beginPath();

                        if (index > 0) {
                            // This is a grid line in the centre, so drop that
                            ctx.lineWidth = this.gridLineWidth;
                            ctx.strokeStyle = this.gridLineColor;
                        } else {
                            // This is the first line on the scale
                            ctx.lineWidth = this.lineWidth;
                            ctx.strokeStyle = this.lineColor;
                        }
                        ctx.moveTo(linePos, this.endPoint);
                        ctx.lineTo(linePos, this.startPoint - 3);
                        ctx.stroke();
                        ctx.closePath();
                    }
                    ctx.lineWidth = this.lineWidth;
                    ctx.strokeStyle = this.lineColor;


                    // Small lines at the bottom of the base grid line
                    ctx.beginPath();
                    ctx.moveTo(linePos, this.endPoint);
                    ctx.lineTo(linePos, this.endPoint + 5);
                    ctx.stroke();
                    ctx.closePath();

                    ctx.save();
                    ctx.translate(xPos, (isRotated) ? this.endPoint + 12 : this.endPoint + 8);
                    ctx.rotate(helpers.radians(this.xLabelRotation) * -1);
                    ctx.font = this.font;
                    ctx.textAlign = (isRotated) ? "right" : "center";
                    ctx.textBaseline = (isRotated) ? "middle" : "top";
                    ctx.fillText(label, 0, 0);
                    ctx.restore();
                }, this);

            }
        }

    });

    helpers.extend(helpers, {
        calculateConstrainedScaleRange: function (valuesArray, drawingSize, textSize, startFromZero, integersOnly, constraints) {
            //Set a minimum step of two - a point at the top of the graph, and a point at the base
            var minSteps = 2,
                maxSteps = Math.floor(drawingSize / (textSize * 1.5)),
                skipFitting = (minSteps >= maxSteps);

            var maxValue = this.max(valuesArray),
                minValue = this.min(valuesArray);

            if (constraints) {
                if (this.isNumber(constraints.yMax)) {
                    maxValue = constraints.yMax;
                }
                if (this.isNumber(constraints.yMin)) {
                    minValue = constraints.yMin;
                }
                if (this.isNumber(constraints.round)) {
                    maxValue = Math.ceil(maxValue / constraints.round) * constraints.round;
                    minValue = Math.floor(minValue / constraints.round) * constraints.round;
                }

            }

            // We need some degree of seperation here to calculate the scales if all the values are the same
            // Adding/minusing 0.5 will give us a range of 1.
            if (maxValue === minValue) {
                maxValue += 0.5;
                // So we don't end up with a graph with a negative start value if we've said always start from zero
                if (minValue >= 0.5 && !startFromZero) {
                    minValue -= 0.5;
                } else {
                    // Make up a whole number above the values
                    maxValue += 0.5;
                }
            }
            var valueRange = Math.abs(maxValue - minValue),
                rangeOrderOfMagnitude = this.calculateOrderOfMagnitude(valueRange),
                graphMax = (constraints && this.isNumber(constraints.yMax)) ? maxValue : Math.ceil(maxValue / (1 * Math.pow(10, rangeOrderOfMagnitude))) * Math.pow(10, rangeOrderOfMagnitude),
                graphMin = (constraints && this.isNumber(constraints.yMin)) ? minValue : (startFromZero) ? 0 : Math.floor(minValue / (1 * Math.pow(10, rangeOrderOfMagnitude))) * Math.pow(10, rangeOrderOfMagnitude),
                graphRange = graphMax - graphMin,
                stepValue = Math.pow(10, rangeOrderOfMagnitude),
                numberOfSteps = Math.round(graphRange / stepValue);


            //If we have more space on the graph we'll use it to give more definition to the data
            while ((numberOfSteps > maxSteps || (numberOfSteps * 2) < maxSteps) && !skipFitting) {
                if (numberOfSteps > maxSteps) {
                    stepValue *= 2;
                    numberOfSteps = Math.round(graphRange / stepValue);
                    // Don't ever deal with a decimal number of steps - cancel fitting and just use the minimum number of steps.
                    if (numberOfSteps % 1 !== 0) {
                        skipFitting = true;
                    }
                }
                //We can fit in double the amount of scale points on the scale
                else {
                    //If user has declared ints only, and the step value isn't a decimal
                    if (integersOnly && rangeOrderOfMagnitude >= 0) {
                        //If the user has said integers only, we need to check that making the scale more granular wouldn't make it a float
                        if (stepValue / 2 % 1 === 0) {
                            stepValue /= 2;
                            numberOfSteps = Math.round(graphRange / stepValue);
                        }
                        //If it would make it a float break out of the loop
                        else {
                            break;
                        }
                    }
                    //If the scale doesn't have to be an int, make the scale more granular anyway.
                    else {
                        stepValue /= 2;
                        numberOfSteps = Math.round(graphRange / stepValue);
                    }

                }
            }

            if (skipFitting) {
                numberOfSteps = minSteps;
                stepValue = graphRange / numberOfSteps;
            }

            return {
                steps: numberOfSteps,
                stepValue: stepValue,
                min: graphMin,
                max: graphMin + (numberOfSteps * stepValue)
            };
        }
    });


}).call(this);
