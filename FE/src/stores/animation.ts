// stores/animation.ts
import { defineStore } from "pinia";

export const useAnimationStore = defineStore("animation", () => {

    const triggerFlyToCart = (sourceElement: HTMLElement, imageUrl: string) => {
        // 1. Tìm vị trí của Icon giỏ hàng trên Header (Target)
        const cartIcon = document.getElementById("cart-icon-desktop");
        if (!sourceElement || !cartIcon) return;

        // 2. Lấy tọa độ của ảnh sản phẩm (Start) và giỏ hàng (End)
        const startRect = sourceElement.getBoundingClientRect();
        const endRect = cartIcon.getBoundingClientRect();

        // 3. Tạo một thẻ Img tạm thời (Clone)
        const flyingImg = document.createElement("img");
        flyingImg.src = imageUrl;
        flyingImg.style.position = "fixed";
        flyingImg.style.zIndex = "9999"; // Phải cao hơn Modal
        flyingImg.style.borderRadius = "100%";
        flyingImg.style.objectFit = "cover";
        flyingImg.style.pointerEvents = "none"; // Không cho click vào

        // Set vị trí bắt đầu
        flyingImg.style.top = `${startRect.top}px`;
        flyingImg.style.left = `${startRect.left}px`;
        flyingImg.style.width = `${startRect.width}px`;
        flyingImg.style.height = `${startRect.height}px`;
        flyingImg.style.transition = "all 0.8s cubic-bezier(0.16, 1, 0.3, 1)"; // Hiệu ứng bay mượt

        document.body.appendChild(flyingImg);

        // 4. Kích hoạt Animation sau 1 khoảng thời gian cực ngắn
        requestAnimationFrame(() => {
            flyingImg.style.top = `${endRect.top + endRect.height / 2 - 10}px`; // Bay vào giữa icon
            flyingImg.style.left = `${endRect.left + endRect.width / 2 - 10}px`;
            flyingImg.style.width = "20px"; // Thu nhỏ lại
            flyingImg.style.height = "20px";
            flyingImg.style.opacity = "0.5";
        });

        // 5. Dọn dẹp DOM sau khi bay xong
        setTimeout(() => {
            flyingImg.remove();
            // Có thể thêm hiệu ứng rung giỏ hàng ở đây nếu muốn
            cartIcon.classList.add("animate-bounce");
            setTimeout(() => cartIcon.classList.remove("animate-bounce"), 500);
        }, 800);
    };

    return { triggerFlyToCart };
});