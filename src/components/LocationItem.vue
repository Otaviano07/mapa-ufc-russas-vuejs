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

const classes = computed(() => ({
  'local-item': true,
  'selected': props.isSelected
}));
</script>

<template>
  <div :class="classes" @click="selectThisLocal">
    <strong>{{ local.nome }}</strong>
    <span v-if="local.andar !== 'terreo'"> ({{ local.andar === 'primeiro' ? '1º' : local.andar }} Andar)</span>
  </div>
</template>

<style scoped>
/* Estilos específicos para local-item já estão em main.css 
.local-item {
  
}
.local-item.selected {
 
}*/
span {
    font-size: 0.8em;
    color: #666;
}
.local-item.selected span {
    color: white; /* Ajusta cor do andar quando selecionado */
}

</style>