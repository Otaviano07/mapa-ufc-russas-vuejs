<script setup>
import { computed } from 'vue';

const props = defineProps({
  local: {
    type: Object,
    required: true
  },
  isSelected: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['select']);

const selectThisLocal = () => {
  emit('select', props.local);
};

// Classes are computed based on selection state
const classes = computed(() => ({
  'local-item': true, // Base class (assuming styles are in main.css or AppSidebar.vue)
  'selected': props.isSelected
}));

// Computed property for floor display text
const floorText = computed(() => {
    if (!props.local.andar || props.local.andar === 'terreo') return '';
    return `(${props.local.andar === 'primeiro' ? '1º' : props.local.andar} Andar)`;
});

</script>

<template>
  <div :class="classes" @click="selectThisLocal">
    <strong>{{ local.nome }}</strong>
    <span v-if="floorText" class="floor-indicator"> {{ floorText }}</span>
  </div>
</template>

<style scoped>
/* Styles for local-item itself are assumed to be in a parent or global CSS. */
/* These styles are specific to the elements *within* this component. */

strong {
    /* Inherit color or define specific color */
    margin-right: 4px; /* Space between name and floor */
}

.floor-indicator {
  font-size: 0.85em; /* Slightly larger than before */
  color: #555; /* Darker grey */
  font-style: italic; /* Add italic style */
}

/* Adjust floor indicator color when the item is selected */
/* This relies on the parent applying the .selected class */
.local-item.selected .floor-indicator {
  color: #e0e0e0; /* Lighter color on dark background */
  font-style: normal; /* Remove italic when selected */
}
</style>