var acc = document.getElementsByClassName("accordion");
        var i;
            
        for (i = 0; i < acc.length; i++) {
            acc[i].addEventListener("click", function() {
                this.classList.toggle("active");
                var panel = this.nextElementSibling;
                if (panel.style.maxHeight) {
                    panel.style.maxHeight = null;
                } else {
                    panel.style.maxHeight = panel.scrollHeight + "px";
                }

                // var chevron = this.nextElementSibling;
                // if (chevron.style.transform) {
                //     chevron.style.transform = rotateY(0deg);
                // } else {
                //     chevron.style.transform = rotateY(180deg);
                // }
            });
        }