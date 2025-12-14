<script setup lang="ts">
import {  ref } from 'vue';

const props = defineProps<{
    modelValue: string; 
    allowCentral: boolean; 
}>();

const emit = defineEmits(['update:modelValue']);

const branches = ['HN', 'HCM', 'DN']; 

const availableOptions = ref([
    ...props.allowCentral ? [{ code: 'CENTRAL', name: 'Toàn Hệ Thống (Central)' }] : [],
    ...branches.map(code => ({ code, name: `Chi nhánh ${code}` }))
]);

const handleChange = (event: Event) => {
    emit('update:modelValue', (event.target as HTMLSelectElement).value);
};
</script>

<template>
    <select 
        :value="modelValue" 
        @change="handleChange"
        class="border border-gray-300 rounded-lg p-2 text-base focus:ring-indigo-500 focus:border-indigo-500 transition duration-150"
    >
        <option 
            v-for="option in availableOptions" 
            :key="option.code" 
            :value="option.code"
        >
            {{ option.name }}
        </option>
    </select>
</template>